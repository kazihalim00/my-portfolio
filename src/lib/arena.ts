// Dev Arena: three short developer games. Shared by the client (play + preview score)
// and the API (which recomputes the score from the raw answers).

export type GameId = "bugspot" | "output" | "sql";
export type Level = "easy" | "medium" | "hard";

export const LEVELS: Level[] = ["easy", "medium", "hard"];
export const BASE: Record<Level, number> = { easy: 50, medium: 100, hard: 150 };

export const GAMES: Record<GameId, { name: string; blurb: string; limit: number; round: number }> = {
  bugspot: { name: "Bug Spotter", blurb: "Read the snippet, click the line that breaks it.", limit: 30, round: 5 },
  output: { name: "Output Guess", blurb: "What does this code really print? JS and PHP quirks inside.", limit: 25, round: 5 },
  sql: { name: "SQL Rush", blurb: "Write real SQL against a tiny shop database. It runs in your browser.", limit: 150, round: 3 },
};

const code = (s: string) => s.replace(/^\n/, "").replace(/\n\s*$/, "").split("\n");

export type BugQ = { id: string; level: Level; lang: "JS" | "PHP" | "SQL" | "Vue"; task: string; lines: string[]; bug: number; explain: string };
export type OutQ = { id: string; level: Level; lang: "JS" | "PHP"; lines: string[]; options: string[]; answer: number; explain: string };
export type SqlQ = { id: string; level: Level; task: string; expected: string; ordered?: boolean; hint: string };

export const BUG_QS: BugQ[] = [
  {
    id: "b-e1", level: "easy", lang: "JS", task: "Add up all numbers in the array.",
    lines: code(`
function sum(nums) {
  let total = 0;
  for (let i = 0; i <= nums.length; i++) {
    total += nums[i];
  }
  return total;
}`),
    bug: 2,
    explain: "Off by one. `i <= nums.length` reads one index past the end, so `nums[i]` is `undefined` and the total becomes NaN. Use `i < nums.length`.",
  },
  {
    id: "b-e2", level: "easy", lang: "PHP", task: "Return true when the person is 18 or older.",
    lines: code(`
function isAdult(int $age): bool {
    if ($age = 18) {
        return true;
    }
    return $age > 18;
}`),
    bug: 1,
    explain: "`$age = 18` assigns instead of comparing, and 18 is truthy, so everyone is an adult. The whole function should be `return $age >= 18;`.",
  },
  {
    id: "b-e3", level: "easy", lang: "JS", task: "Greet the user by name.",
    lines: code(`
const user = { name: "Kazi" };
function greet(u) {
  return "Hello, " + u.Name + "!";
}
console.log(greet(user));`),
    bug: 2,
    explain: "Property names are case sensitive. `u.Name` is `undefined`, so it prints \"Hello, undefined!\". Use `u.name`.",
  },
  {
    id: "b-e4", level: "easy", lang: "JS", task: "Keep only the even numbers.",
    lines: code(`
// [1, 2, 3, 4] -> [2, 4]
function evens(list) {
  return list.filter((n) => n % 2 === 1);
}`),
    bug: 2,
    explain: "`n % 2 === 1` keeps the odd numbers. Even numbers have remainder 0: `n % 2 === 0`.",
  },
  {
    id: "b-e5", level: "easy", lang: "SQL", task: "Active users that are not deleted.",
    lines: code(`
SELECT id, name
FROM users
WHERE status = 'active'
  OR deleted_at IS NULL;`),
    bug: 3,
    explain: "With OR, any non-deleted user matches even if inactive (and any active user matches even if deleted). Both conditions must hold: use AND.",
  },
  {
    id: "b-e6", level: "easy", lang: "PHP", task: "Laravel: show a post, or a 404 page when it does not exist.",
    lines: code(`
Route::get('/posts/{id}', function ($id) {
    $post = Post::find($id);
    return view('posts.show', ['post' => $post]);
});`),
    bug: 1,
    explain: "`find()` returns null for a missing id, so the view crashes with a 500. `Post::findOrFail($id)` throws and Laravel turns it into a 404.",
  },
  {
    id: "b-m1", level: "medium", lang: "JS", task: "Load the user list from the API.",
    lines: code(`
async function loadUsers() {
  const res = fetch("/api/users");
  const data = await res.json();
  return data;
}`),
    bug: 1,
    explain: "`fetch` returns a Promise. Without `await`, `res` is the Promise itself and `res.json` is not a function. Write `const res = await fetch(...)`.",
  },
  {
    id: "b-m2", level: "medium", lang: "JS", task: "Each button should alert its own number.",
    lines: code(`
const buttons = document.querySelectorAll("button");
for (var i = 0; i < buttons.length; i++) {
  buttons[i].onclick = () => alert("Button " + i);
}`),
    bug: 1,
    explain: "`var` is function scoped, so every click handler shares one `i`, which is already `buttons.length` when you click. `let` creates a fresh `i` per iteration.",
  },
  {
    id: "b-m3", level: "medium", lang: "PHP", task: "Log in only when the PIN matches exactly.",
    lines: code(`
$input = $_GET['pin'] ?? '';
$saved = '0e1234';
if ($input == $saved) {
    login();
}`),
    bug: 2,
    explain: "Loose `==` compares numeric strings as numbers. '0e1234' is 0 in scientific notation, so typing \"0\" logs you in. Use `===`, or `hash_equals()` for secrets.",
  },
  {
    id: "b-m4", level: "medium", lang: "SQL", task: "Order count per customer, including customers with zero orders.",
    lines: code(`
SELECT c.name, COUNT(o.id) AS orders
FROM customers c
JOIN orders o ON o.customer_id = c.id
GROUP BY c.name;`),
    bug: 2,
    explain: "An inner JOIN drops customers without orders. `LEFT JOIN` keeps them, and `COUNT(o.id)` then gives 0 for them.",
  },
  {
    id: "b-m5", level: "medium", lang: "PHP", task: "Laravel: list posts with author names, without an N+1 query problem.",
    lines: code(`
$posts = Post::all();
foreach ($posts as $post) {
    echo $post->author->name;
}`),
    bug: 0,
    explain: "Each `$post->author` fires its own query: 1 + N queries. Eager load: `Post::with('author')->get()` makes it two queries total.",
  },
  {
    id: "b-m6", level: "medium", lang: "JS", task: "Print the lowest score.",
    lines: code(`
const scores = [10, 9, 100, 25];
scores.sort();
console.log(scores[0]); // expected 9`),
    bug: 1,
    explain: "Default `sort()` compares strings, giving [10, 100, 25, 9]. Pass a comparator: `scores.sort((a, b) => a - b)`.",
  },
  {
    id: "b-m7", level: "medium", lang: "Vue", task: "Vue 3: a counter whose number updates on screen.",
    lines: code(`
<script setup>
let count = 0;
function increment() {
  count++;
}
</script>`),
    bug: 1,
    explain: "A plain variable is not reactive, so the template never re-renders. Use `const count = ref(0)` and `count.value++`.",
  },
  {
    id: "b-m8", level: "medium", lang: "SQL", task: "Employees who have no manager.",
    lines: code(`
SELECT name
FROM employees
WHERE manager_id = NULL;`),
    bug: 2,
    explain: "Nothing is ever equal to NULL, not even NULL, so this returns no rows. Use `WHERE manager_id IS NULL`.",
  },
  {
    id: "b-h1", level: "hard", lang: "JS", task: "Save every item, then log once everything is saved.",
    lines: code(`
async function saveAll(items) {
  items.forEach(async (item) => {
    await db.save(item);
  });
  console.log("All saved!");
}`),
    bug: 1,
    explain: "`forEach` ignores the promises its callback returns, so the log runs before any save finishes. Use `await Promise.all(items.map((i) => db.save(i)))` or a `for...of` loop.",
  },
  {
    id: "b-h2", level: "hard", lang: "PHP", task: "Laravel: let users edit only their name and bio.",
    lines: code(`
public function update(Request $request, User $user)
{
    $user->update($request->all());
    return back();
}`),
    bug: 2,
    explain: "Mass assignment: a user can post `is_admin=1` or any other column. Validate and whitelist: `$user->update($request->validate([...]))` or `$request->only('name', 'bio')`.",
  },
  {
    id: "b-h3", level: "hard", lang: "PHP", task: "Laravel: find a user by email, safely.",
    lines: code(`
$email = $request->input('email');
$users = DB::select(
    "SELECT * FROM users WHERE email = '$email'"
);`),
    bug: 2,
    explain: "SQL injection. An email like `' OR '1'='1` dumps every user. Bind parameters: `DB::select('... WHERE email = ?', [$email])`, or use Eloquent.",
  },
  {
    id: "b-h4", level: "hard", lang: "JS", task: "Detect a value that failed to parse as a number.",
    lines: code(`
function isMissing(value) {
  return value === NaN;
}
isMissing(Number("abc")); // expected true`),
    bug: 1,
    explain: "NaN is the only value not equal to itself, so `=== NaN` is always false. Use `Number.isNaN(value)`.",
  },
  {
    id: "b-h5", level: "hard", lang: "PHP", task: "Abort with 403 unless 'admin' is in the roles list.",
    lines: code(`
$roles = ['admin', 'editor', 'viewer'];
$pos = array_search('admin', $roles);
if (!$pos) {
    abort(403);
}`),
    bug: 2,
    explain: "'admin' is found at index 0, and `!0` is true, so the real admin gets a 403. Check `$pos === false`, or simply use `in_array('admin', $roles, true)`.",
  },
  {
    id: "b-h6", level: "hard", lang: "JS", task: "Convert string ids to numbers.",
    lines: code(`
const raw = ["1", "2", "3"];
const ids = raw.map(parseInt);
console.log(ids); // want [1, 2, 3]`),
    bug: 1,
    explain: "`map` passes (value, index), so this calls parseInt('2', 1) and parseInt('3', 2), which are NaN. Result: [1, NaN, NaN]. Use `raw.map(Number)`.",
  },
];

export const OUT_QS: OutQ[] = [
  { id: "o-e1", level: "easy", lang: "JS", lines: code(`console.log(typeof null);`), options: ["\"null\"", "\"object\"", "\"undefined\"", "TypeError"], answer: 1, explain: "A famous bug from JavaScript's first version that can never be fixed: `typeof null` is \"object\". Check for null with `x === null`." },
  { id: "o-e2", level: "easy", lang: "JS", lines: code(`console.log("5" + 3);`), options: ["8", "53", "NaN", "TypeError"], answer: 1, explain: "If either side of `+` is a string, JavaScript concatenates. 3 becomes \"3\", giving \"53\"." },
  { id: "o-e3", level: "easy", lang: "JS", lines: code(`console.log("5" - 3);`), options: ["\"53\"", "NaN", "2", "\"2\""], answer: 2, explain: "`-` only works on numbers, so \"5\" is converted to 5 and you get the number 2." },
  { id: "o-e4", level: "easy", lang: "PHP", lines: code(`echo "10" + 5;`), options: ["105", "15", "\"10\"5", "TypeError"], answer: 1, explain: "PHP's `+` is always numeric; the string concatenation operator is `.`. \"10\" becomes 10, so it prints 15." },
  { id: "o-e5", level: "easy", lang: "PHP", lines: code(`
$name = "Kazi";
echo "Hi $name ";
echo 'Hi $name';`), options: ["Hi Kazi Hi Kazi", "Hi Kazi Hi $name", "Hi $name Hi Kazi", "Hi $name Hi $name"], answer: 1, explain: "Double quotes interpolate variables, single quotes print the text literally." },
  { id: "o-e6", level: "easy", lang: "JS", lines: code(`console.log(0.1 + 0.2 === 0.3);`), options: ["true", "false", "NaN", "0.3"], answer: 1, explain: "Binary floating point cannot store 0.1 exactly: 0.1 + 0.2 is 0.30000000000000004. Compare with a tolerance, or keep money in integer cents." },
  { id: "o-m1", level: "medium", lang: "JS", lines: code(`console.log([] + []);`), options: ["[]", "\"\" (empty string)", "0", "undefined"], answer: 1, explain: "Arrays become strings with `+`. An empty array stringifies to \"\", and \"\" + \"\" is an empty string." },
  { id: "o-m2", level: "medium", lang: "JS", lines: code(`console.log([10, 1, 2].sort());`), options: ["[1, 2, 10]", "[10, 2, 1]", "[1, 10, 2]", "[10, 1, 2]"], answer: 2, explain: "Default sort compares as strings: \"1\" < \"10\" < \"2\". Pass `(a, b) => a - b` for numbers." },
  { id: "o-m3", level: "medium", lang: "JS", lines: code(`
let x = 1;
{
  let x = 2;
}
console.log(x);`), options: ["1", "2", "undefined", "SyntaxError"], answer: 0, explain: "`let` is block scoped. The inner x is a different variable that only lives inside the braces." },
  { id: "o-m4", level: "medium", lang: "JS", lines: code(`console.log(typeof NaN);`), options: ["\"NaN\"", "\"undefined\"", "\"number\"", "\"object\""], answer: 2, explain: "NaN means Not-a-Number, yet it is a value of the number type (an IEEE 754 special value)." },
  { id: "o-m5", level: "medium", lang: "PHP", lines: code(`var_dump(0 == "a");`), options: ["bool(true)", "bool(false)", "int(0)", "TypeError"], answer: 1, explain: "In PHP 8, comparing a number with a non-numeric string compares them as strings, so it is false. In PHP 7 this was true, which caused many bugs." },
  { id: "o-m6", level: "medium", lang: "PHP", lines: code(`
$x = 5;
$y = $x++ + ++$x;
echo $y;`), options: ["10", "11", "12", "13"], answer: 2, explain: "`$x++` gives 5 then makes x 6. `++$x` makes x 7 and gives 7. 5 + 7 = 12." },
  { id: "o-m7", level: "medium", lang: "JS", lines: code(`console.log(1 < 2 < 3, 3 > 2 > 1);`), options: ["true true", "true false", "false true", "false false"], answer: 1, explain: "Comparisons run left to right. `3 > 2` is true, and `true > 1` means 1 > 1, which is false." },
  { id: "o-h1", level: "hard", lang: "JS", lines: code(`
console.log(1);
setTimeout(() => console.log(2), 0);
Promise.resolve().then(() => console.log(3));
console.log(4);`), options: ["1 2 3 4", "1 4 2 3", "1 4 3 2", "1 3 4 2"], answer: 2, explain: "Sync code first (1, 4). Then the microtask queue (promise: 3), and only then macrotasks like setTimeout (2)." },
  { id: "o-h2", level: "hard", lang: "JS", lines: code(`
for (var i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 0);
}`), options: ["0 1 2", "3 3 3", "2 2 2", "undefined x3"], answer: 1, explain: "All three callbacks share one function-scoped `var i`, which is 3 by the time they run. With `let` you get 0 1 2." },
  { id: "o-h3", level: "hard", lang: "JS", lines: code(`
function f() {
  return
  { ok: true };
}
console.log(f());`), options: ["{ ok: true }", "undefined", "SyntaxError", "true"], answer: 1, explain: "Automatic semicolon insertion puts a `;` right after `return`, so the function returns undefined. Keep the `{` on the same line as return." },
  { id: "o-h4", level: "hard", lang: "PHP", lines: code(`
$arr = [1, 2, 3];
foreach ($arr as &$v) {}
foreach ($arr as $v) {}
print_r($arr); // shown as a list`), options: ["[1, 2, 3]", "[1, 2, 2]", "[3, 3, 3]", "[1, 1, 1]"], answer: 1, explain: "After the first loop `$v` is still a reference to `$arr[2]`. The second loop writes each value into it, so the last slot ends as 2. Always `unset($v)` after a by-reference foreach." },
  { id: "o-h5", level: "hard", lang: "PHP", lines: code(`var_dump("1e3" == "1000");`), options: ["bool(true)", "bool(false)", "int(1000)", "TypeError"], answer: 0, explain: "Both strings are numeric, so `==` compares them as numbers: 1e3 is 1000. Use `===` to compare strings exactly." },
  { id: "o-h6", level: "hard", lang: "JS", lines: code(`console.log(typeof typeof 1);`), options: ["\"number\"", "\"string\"", "\"typeof\"", "\"undefined\""], answer: 1, explain: "`typeof 1` is the string \"number\", and the typeof of any string is \"string\"." },
  { id: "o-h7", level: "hard", lang: "JS", lines: code(`console.log(0.1 * 3);`), options: ["0.3", "0.30000000000000004", "0.29999999999999999", "0.3000000000000001"], answer: 1, explain: "Same floating point story: 0.1 is stored as a tiny bit more than 0.1, and multiplying shows the error." },
];

// SQL Rush runs in the browser with alasql against this small shop database.
export const SQL_SCHEMA = {
  customers: { cols: ["id", "name", "city"], rows: [
    [1, "Rahim", "Sylhet"], [2, "Karim", "Dhaka"], [3, "Nadia", "Sylhet"], [4, "Tania", "Chattogram"], [5, "Sakib", "Dhaka"], [6, "Mitu", "Khulna"],
  ] },
  orders: { cols: ["id", "customer_id", "amount", "status", "created_at"], rows: [
    [1, 1, 1200, "paid", "2026-01-05"], [2, 1, 450, "paid", "2026-02-11"], [3, 2, 3000, "refunded", "2026-02-14"],
    [4, 3, 800, "paid", "2026-03-01"], [5, 3, 2200, "paid", "2026-03-09"], [6, 4, 150, "pending", "2026-03-15"],
    [7, 5, 5100, "paid", "2026-04-02"], [8, 2, 700, "paid", "2026-04-20"], [9, 5, 90, "pending", "2026-05-01"],
  ] },
} as const;

export const SQL_QS: SqlQ[] = [
  { id: "s-e1", level: "easy", task: "List the names of customers who live in Sylhet.", expected: "SELECT name FROM customers WHERE city = 'Sylhet'", hint: "SELECT ... FROM customers WHERE city = '...'" },
  { id: "s-e2", level: "easy", task: "Show paid orders with an amount above 1000. Columns: id, amount.", expected: "SELECT id, amount FROM orders WHERE status = 'paid' AND amount > 1000", hint: "Two conditions joined with AND." },
  { id: "s-e3", level: "easy", task: "How many orders are pending? Return a single number.", expected: "SELECT COUNT(*) AS n FROM orders WHERE status = 'pending'", hint: "COUNT(*) with a WHERE." },
  { id: "s-e4", level: "easy", task: "The 3 biggest orders, highest first. Columns: id, amount.", expected: "SELECT id, amount FROM orders ORDER BY amount DESC LIMIT 3", ordered: true, hint: "ORDER BY ... DESC LIMIT 3" },
  { id: "s-m1", level: "medium", task: "Paid revenue per customer_id, highest first. Columns: customer_id, revenue.", expected: "SELECT customer_id, SUM(amount) AS revenue FROM orders WHERE status = 'paid' GROUP BY customer_id ORDER BY revenue DESC", ordered: true, hint: "SUM(amount) with GROUP BY customer_id." },
  { id: "s-m2", level: "medium", task: "Every paid order with the customer's name. Columns: name, amount.", expected: "SELECT c.name, o.amount FROM orders o JOIN customers c ON c.id = o.customer_id WHERE o.status = 'paid'", hint: "JOIN customers ON customers.id = orders.customer_id" },
  { id: "s-m3", level: "medium", task: "Cities that have more than one customer. Columns: city, number of customers.", expected: "SELECT city, COUNT(*) AS n FROM customers GROUP BY city HAVING COUNT(*) > 1", hint: "GROUP BY city, then filter groups with HAVING." },
  { id: "s-m4", level: "medium", task: "Orders placed in March 2026. Columns: id, created_at.", expected: "SELECT id, created_at FROM orders WHERE created_at >= '2026-03-01' AND created_at < '2026-04-01'", hint: "Dates are 'YYYY-MM-DD' text. LIKE '2026-03%' works too." },
  { id: "s-h1", level: "hard", task: "Customers who never placed an order. Column: name.", expected: "SELECT name FROM customers WHERE id NOT IN (SELECT customer_id FROM orders)", hint: "LEFT JOIN ... WHERE o.id IS NULL, or NOT IN a subquery." },
  { id: "s-h2", level: "hard", task: "The customer with the single biggest paid order, and that amount. Columns: name, amount.", expected: "SELECT c.name, o.amount FROM orders o JOIN customers c ON c.id = o.customer_id WHERE o.status = 'paid' ORDER BY o.amount DESC LIMIT 1", hint: "JOIN, filter paid, ORDER BY amount DESC LIMIT 1." },
  { id: "s-h3", level: "hard", task: "Paid revenue per city, highest first. Columns: city, revenue.", expected: "SELECT c.city, SUM(o.amount) AS revenue FROM orders o JOIN customers c ON c.id = o.customer_id WHERE o.status = 'paid' GROUP BY c.city ORDER BY revenue DESC", ordered: true, hint: "JOIN, WHERE paid, GROUP BY city, ORDER BY the sum." },
  { id: "s-h4", level: "hard", task: "Customers whose average paid order is above 1000. Columns: name, average.", expected: "SELECT c.name, AVG(o.amount) AS avg_total FROM orders o JOIN customers c ON c.id = o.customer_id WHERE o.status = 'paid' GROUP BY c.name HAVING AVG(o.amount) > 1000", hint: "AVG() with GROUP BY and HAVING." },
];

export const BY_ID: Record<string, { game: GameId; level: Level; answer?: number }> = Object.fromEntries([
  ...BUG_QS.map((q) => [q.id, { game: "bugspot" as const, level: q.level, answer: q.bug }]),
  ...OUT_QS.map((q) => [q.id, { game: "output" as const, level: q.level, answer: q.answer }]),
  ...SQL_QS.map((q) => [q.id, { game: "sql" as const, level: q.level }]),
]);

export type Answer = { id: string; ok: boolean; ms: number };

/** Points for one round. Correct answers earn the level's base, up to +50% for speed, and +25 from the 3rd correct in a row. */
export function scoreRound(game: GameId, answers: Answer[]) {
  const limitMs = GAMES[game].limit * 1000;
  let streak = 0;
  let best = 0;
  let total = 0;
  for (const a of answers) {
    const meta = BY_ID[a.id];
    if (!meta || !a.ok) {
      streak = 0;
      continue;
    }
    streak++;
    best = Math.max(best, streak);
    const base = BASE[meta.level];
    const ms = Math.min(Math.max(a.ms, 0), limitMs);
    total += base + Math.round(base * 0.5 * (1 - ms / limitMs)) + (streak >= 3 ? 25 : 0);
  }
  return { total, best, correct: answers.filter((a) => a.ok && BY_ID[a.id]).length };
}

export function pool(game: GameId, level: Level): string[] {
  const list = game === "bugspot" ? BUG_QS : game === "output" ? OUT_QS : SQL_QS;
  return list.filter((q) => q.level === level).map((q) => q.id);
}

/** Today's daily challenge: one Bug Spotter or Output Guess question, same for everyone on a given UTC day. */
export function dailyQuestion(date = new Date()) {
  const day = Math.floor(date.getTime() / 86_400_000);
  const all = [...BUG_QS.map((q) => ({ kind: "bugspot" as const, q })), ...OUT_QS.map((q) => ({ kind: "output" as const, q }))];
  const pick = all[(day * 7919) % all.length];
  return { day, ...pick };
}
