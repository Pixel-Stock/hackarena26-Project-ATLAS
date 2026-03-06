import { Transaction, Category, Budget, Receipt, User } from "./types";
import { generateId } from "./utils";

// default user for demo purposes
export const defaultUser: User = {
    id: "user-1",
    email: "team@atlas.dev",
    name: "Team ATLAS",
    avatar_url: "",
    created_at: new Date().toISOString(),
};

// seed categories with icons and budget limits
export const seedCategories: Category[] = [
    { id: generateId(), user_id: "user-1", name: "Food & Dining", icon: "🍕", budget_limit: 8000, created_at: new Date().toISOString() },
    { id: generateId(), user_id: "user-1", name: "Groceries", icon: "🛒", budget_limit: 6000, created_at: new Date().toISOString() },
    { id: generateId(), user_id: "user-1", name: "Transport", icon: "🚗", budget_limit: 4000, created_at: new Date().toISOString() },
    { id: generateId(), user_id: "user-1", name: "Shopping", icon: "🛍️", budget_limit: 5000, created_at: new Date().toISOString() },
    { id: generateId(), user_id: "user-1", name: "Entertainment", icon: "🎬", budget_limit: 3000, created_at: new Date().toISOString() },
    { id: generateId(), user_id: "user-1", name: "Bills & Utilities", icon: "💡", budget_limit: 5000, created_at: new Date().toISOString() },
    { id: generateId(), user_id: "user-1", name: "Health", icon: "💊", budget_limit: 2000, created_at: new Date().toISOString() },
    { id: generateId(), user_id: "user-1", name: "Education", icon: "📚", budget_limit: 3000, created_at: new Date().toISOString() },
];

// helper to create a date string
function makeDate(daysAgo: number): string {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    return d.toISOString().split("T")[0];
}

// seed transactions for past 3 months
export const seedTransactions: Transaction[] = [
    // recent transactions (this week)
    { id: generateId(), user_id: "user-1", merchant: "Swiggy", category: "Food & Dining", amount: 450, date: makeDate(0), notes: "Lunch order", created_at: new Date().toISOString() },
    { id: generateId(), user_id: "user-1", merchant: "Amazon", category: "Shopping", amount: 2499, date: makeDate(1), notes: "Wireless earbuds", created_at: new Date().toISOString() },
    { id: generateId(), user_id: "user-1", merchant: "Uber", category: "Transport", amount: 280, date: makeDate(1), notes: "Ride to college", created_at: new Date().toISOString() },
    { id: generateId(), user_id: "user-1", merchant: "BigBasket", category: "Groceries", amount: 1850, date: makeDate(2), notes: "Weekly groceries", created_at: new Date().toISOString() },
    { id: generateId(), user_id: "user-1", merchant: "Netflix", category: "Entertainment", amount: 649, date: makeDate(3), notes: "Monthly subscription", created_at: new Date().toISOString() },
    { id: generateId(), user_id: "user-1", merchant: "Zomato", category: "Food & Dining", amount: 380, date: makeDate(3), notes: "Dinner delivery", created_at: new Date().toISOString() },
    { id: generateId(), user_id: "user-1", merchant: "Reliance Digital", category: "Shopping", amount: 1299, date: makeDate(4), notes: "USB-C cable + charger", created_at: new Date().toISOString() },
    { id: generateId(), user_id: "user-1", merchant: "Ola", category: "Transport", amount: 195, date: makeDate(5), notes: "Auto to station", created_at: new Date().toISOString() },
    { id: generateId(), user_id: "user-1", merchant: "Apollo Pharmacy", category: "Health", amount: 560, date: makeDate(5), notes: "Medicines", created_at: new Date().toISOString() },
    { id: generateId(), user_id: "user-1", merchant: "Dominos", category: "Food & Dining", amount: 699, date: makeDate(6), notes: "Pizza party", created_at: new Date().toISOString() },

    // last week
    { id: generateId(), user_id: "user-1", merchant: "DMart", category: "Groceries", amount: 2340, date: makeDate(8), notes: "Monthly stock up", created_at: new Date().toISOString() },
    { id: generateId(), user_id: "user-1", merchant: "BookMyShow", category: "Entertainment", amount: 500, date: makeDate(9), notes: "Movie tickets", created_at: new Date().toISOString() },
    { id: generateId(), user_id: "user-1", merchant: "Electricity Board", category: "Bills & Utilities", amount: 1800, date: makeDate(10), notes: "Electricity bill", created_at: new Date().toISOString() },
    { id: generateId(), user_id: "user-1", merchant: "Flipkart", category: "Shopping", amount: 3999, date: makeDate(10), notes: "Backpack", created_at: new Date().toISOString() },
    { id: generateId(), user_id: "user-1", merchant: "Starbucks", category: "Food & Dining", amount: 520, date: makeDate(11), notes: "Coffee meeting", created_at: new Date().toISOString() },
    { id: generateId(), user_id: "user-1", merchant: "Metro Card", category: "Transport", amount: 500, date: makeDate(12), notes: "Metro recharge", created_at: new Date().toISOString() },
    { id: generateId(), user_id: "user-1", merchant: "Coursera", category: "Education", amount: 1499, date: makeDate(13), notes: "ML course", created_at: new Date().toISOString() },
    { id: generateId(), user_id: "user-1", merchant: "Jio", category: "Bills & Utilities", amount: 499, date: makeDate(14), notes: "Mobile recharge", created_at: new Date().toISOString() },

    // 2-4 weeks ago
    { id: generateId(), user_id: "user-1", merchant: "Swiggy", category: "Food & Dining", amount: 620, date: makeDate(16), notes: "Team dinner", created_at: new Date().toISOString() },
    { id: generateId(), user_id: "user-1", merchant: "Zepto", category: "Groceries", amount: 890, date: makeDate(18), notes: "Quick groceries", created_at: new Date().toISOString() },
    { id: generateId(), user_id: "user-1", merchant: "Myntra", category: "Shopping", amount: 1799, date: makeDate(20), notes: "T-shirts", created_at: new Date().toISOString() },
    { id: generateId(), user_id: "user-1", merchant: "Uber", category: "Transport", amount: 350, date: makeDate(22), notes: "Airport drop", created_at: new Date().toISOString() },
    { id: generateId(), user_id: "user-1", merchant: "Spotify", category: "Entertainment", amount: 119, date: makeDate(24), notes: "Music subscription", created_at: new Date().toISOString() },
    { id: generateId(), user_id: "user-1", merchant: "Water Board", category: "Bills & Utilities", amount: 450, date: makeDate(25), notes: "Water bill", created_at: new Date().toISOString() },
    { id: generateId(), user_id: "user-1", merchant: "MedPlus", category: "Health", amount: 320, date: makeDate(27), notes: "Vitamins", created_at: new Date().toISOString() },

    // last month
    { id: generateId(), user_id: "user-1", merchant: "Zomato", category: "Food & Dining", amount: 890, date: makeDate(32), notes: "Birthday dinner", created_at: new Date().toISOString() },
    { id: generateId(), user_id: "user-1", merchant: "BigBasket", category: "Groceries", amount: 2100, date: makeDate(35), notes: "Groceries", created_at: new Date().toISOString() },
    { id: generateId(), user_id: "user-1", merchant: "Amazon", category: "Shopping", amount: 4599, date: makeDate(38), notes: "Keyboard", created_at: new Date().toISOString() },
    { id: generateId(), user_id: "user-1", merchant: "Petrol Pump", category: "Transport", amount: 2000, date: makeDate(40), notes: "Fuel", created_at: new Date().toISOString() },
    { id: generateId(), user_id: "user-1", merchant: "Prime Video", category: "Entertainment", amount: 299, date: makeDate(42), notes: "Subscription", created_at: new Date().toISOString() },
    { id: generateId(), user_id: "user-1", merchant: "Electricity Board", category: "Bills & Utilities", amount: 2100, date: makeDate(45), notes: "Electricity bill", created_at: new Date().toISOString() },
    { id: generateId(), user_id: "user-1", merchant: "Udemy", category: "Education", amount: 449, date: makeDate(48), notes: "React course", created_at: new Date().toISOString() },

    // 2 months ago
    { id: generateId(), user_id: "user-1", merchant: "Swiggy", category: "Food & Dining", amount: 750, date: makeDate(55), notes: "Weekend feast", created_at: new Date().toISOString() },
    { id: generateId(), user_id: "user-1", merchant: "DMart", category: "Groceries", amount: 3200, date: makeDate(58), notes: "Monthly groceries", created_at: new Date().toISOString() },
    { id: generateId(), user_id: "user-1", merchant: "Flipkart", category: "Shopping", amount: 1599, date: makeDate(60), notes: "Phone case", created_at: new Date().toISOString() },
    { id: generateId(), user_id: "user-1", merchant: "Rapido", category: "Transport", amount: 150, date: makeDate(62), notes: "Bike ride", created_at: new Date().toISOString() },
    { id: generateId(), user_id: "user-1", merchant: "Inox", category: "Entertainment", amount: 800, date: makeDate(65), notes: "Movie + snacks", created_at: new Date().toISOString() },
    { id: generateId(), user_id: "user-1", merchant: "Gas Bill", category: "Bills & Utilities", amount: 650, date: makeDate(68), notes: "Cooking gas", created_at: new Date().toISOString() },
    { id: generateId(), user_id: "user-1", merchant: "Dr. Sharma", category: "Health", amount: 800, date: makeDate(70), notes: "Check-up", created_at: new Date().toISOString() },
    { id: generateId(), user_id: "user-1", merchant: "Zomato", category: "Food & Dining", amount: 430, date: makeDate(72), notes: "Lunch", created_at: new Date().toISOString() },

    // 3 months ago
    { id: generateId(), user_id: "user-1", merchant: "BigBasket", category: "Groceries", amount: 1950, date: makeDate(80), notes: "Groceries", created_at: new Date().toISOString() },
    { id: generateId(), user_id: "user-1", merchant: "Amazon", category: "Shopping", amount: 899, date: makeDate(82), notes: "Books", created_at: new Date().toISOString() },
    { id: generateId(), user_id: "user-1", merchant: "Ola", category: "Transport", amount: 420, date: makeDate(85), notes: "Trip to mall", created_at: new Date().toISOString() },
    { id: generateId(), user_id: "user-1", merchant: "Dominos", category: "Food & Dining", amount: 550, date: makeDate(88), notes: "Pizza night", created_at: new Date().toISOString() },
    { id: generateId(), user_id: "user-1", merchant: "Electricity Board", category: "Bills & Utilities", amount: 1650, date: makeDate(90), notes: "Electricity", created_at: new Date().toISOString() },
];

// seed budget
export const seedBudgets: Budget[] = [
    { id: generateId(), user_id: "user-1", month: new Date().toISOString().slice(0, 7), budget_limit: 35000, created_at: new Date().toISOString() },
];

// seed receipts
export const seedReceipts: Receipt[] = [
    { id: generateId(), user_id: "user-1", image_url: "/receipt-sample.jpg", ocr_text: "Swiggy Order\nItems: Butter Chicken, Naan x2\nTotal: ₹450", merchant: "Swiggy", amount: 450, created_at: new Date().toISOString() },
    { id: generateId(), user_id: "user-1", image_url: "/receipt-sample2.jpg", ocr_text: "BigBasket\nVegetables, Fruits, Dairy\nTotal: ₹1850", merchant: "BigBasket", amount: 1850, created_at: new Date().toISOString() },
];
