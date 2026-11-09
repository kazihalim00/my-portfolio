export type BugId = "negQty" | "removeWrong" | "cents" | "shipping" | "coupon" | "email" | "doubleSubmit" | "typo";

export type BugInfo = {
  id: BugId;
  title: string;
  severity: "Critical" | "High" | "Medium" | "Low";
  hint: string;
  steps: string[];
  expected: string;
  actual: string;
  test: string; // matching test name in the test runner
};

export const BUGS: BugInfo[] = [
  {
    id: "negQty",
    title: "Quantity accepts negative numbers",
    severity: "High",
    hint: "What happens if you type a strange quantity?",
    steps: ["Open the cart", "Type -2 into any quantity box"],
    expected: "Quantity is limited to 1 or more",
    actual: "Quantity becomes negative and the total goes down",
    test: "cart › quantity rejects negative numbers",
  },
  {
    id: "removeWrong",
    title: "Remove deletes the wrong item",
    severity: "High",
    hint: "Try removing something that is not at the top.",
    steps: ["Open the cart", "Click Remove on the 2nd or 3rd item"],
    expected: "The clicked item is removed",
    actual: "The first item in the cart is removed instead",
    test: "cart › remove deletes the clicked item",
  },
  {
    id: "cents",
    title: "Line total drops the cents",
    severity: "Medium",
    hint: "Compare each item's price with its line total. Use Report mode.",
    steps: ["Look at Wireless Mouse ($19.99 × 1)", "Read its line total"],
    expected: "Line total is $19.99",
    actual: "Line total shows $19.00 (price is floored)",
    test: "pricing › line totals keep cents",
  },
  {
    id: "shipping",
    title: "Free shipping promise is broken",
    severity: "Medium",
    hint: "The banner makes a promise. Does the summary keep it? Use Report mode.",
    steps: ["Keep the subtotal above $50", "Read the Shipping row"],
    expected: "Shipping is $0.00 over $50",
    actual: "Shipping is still charged at $5.00",
    test: "pricing › free shipping over $50",
  },
  {
    id: "coupon",
    title: "Coupon can be applied more than once",
    severity: "Critical",
    hint: "The banner gives you a code. Be greedy with it.",
    steps: ["Enter SAVE10 in the coupon box", "Click Apply twice"],
    expected: "SAVE10 applies once; second attempt shows 'already applied'",
    actual: "Discount stacks every time Apply is clicked",
    test: "coupon › SAVE10 can only be applied once",
  },
  {
    id: "email",
    title: "Invalid email is accepted",
    severity: "High",
    hint: "Checkout trusts you a little too much.",
    steps: ["Type 'abc' as email", "Fill the name", "Click Place order"],
    expected: "Form shows 'Enter a valid email'",
    actual: "Order is placed with an invalid email",
    test: "checkout › rejects invalid email",
  },
  {
    id: "doubleSubmit",
    title: "Double click places two orders",
    severity: "Critical",
    hint: "Impatient users click twice. Do you?",
    steps: ["Fill a valid checkout form", "Double-click Place order quickly"],
    expected: "Button is disabled while the order is processing",
    actual: "Two orders are created",
    test: "checkout › button is disabled while submitting",
  },
  {
    id: "typo",
    title: "Typo in the order summary",
    severity: "Low",
    hint: "Read the summary labels slowly. Use Report mode.",
    steps: ["Open the order summary", "Read the label of the last row"],
    expected: "Label reads 'Total'",
    actual: "Label reads 'Totla'",
    test: "ui › summary labels are spelled correctly",
  },
];

export const BUG_POINTS = 100;
export const HINT_COST = 25;
export const FALSE_REPORT_COST = 10;
