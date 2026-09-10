import { supabase } from "./supabase.js";


// ============================================================
// ELEMENTS
// ============================================================

const userName = document.getElementById("userName");
const userEmail = document.getElementById("userEmail");
const userInitial = document.getElementById("userInitial");

const totalReceived = document.getElementById("totalReceived");
const totalPaid = document.getElementById("totalPaid");
const totalPending = document.getElementById("totalPending");
const totalOverdue = document.getElementById("totalOverdue");

const creditCount = document.getElementById("creditCount");
const debitCount = document.getElementById("debitCount");

const creditAmount = document.getElementById("creditAmount");
const debitAmount = document.getElementById("debitAmount");

const creditPaid = document.getElementById("creditPaid");
const debitPaid = document.getElementById("debitPaid");

const creditOutstanding =
    document.getElementById("creditOutstanding");

const debitOutstanding =
    document.getElementById("debitOutstanding");

const logoutButton =
    document.getElementById("logoutButton");

const refreshButton =
    document.getElementById("refreshButton");


// ============================================================
// VARIABLES
// ============================================================

let currentUser = null;
let transactions = [];

let creditDebitChart = null;
let statusChart = null;
let monthlyChart = null;


// ============================================================
// AUTH
// ============================================================

async function checkUser() {

    const {
        data: { session },
        error
    } = await supabase.auth.getSession();

    if (error) {

        console.error("Session error:", error);

        window.location.href = "/login.html";

        return false;
    }

    if (!session) {

        window.location.href = "/login.html";

        return false;
    }

    currentUser = session.user;

    const fullName =
        currentUser.user_metadata?.full_name || "User";

    if (userName) {
        userName.textContent = fullName;
    }

    if (userEmail) {
        userEmail.textContent = currentUser.email;
    }

    if (userInitial) {
        userInitial.textContent =
            fullName.charAt(0).toUpperCase();
    }

    return true;
}


// ============================================================
// FORMAT MONEY
// ============================================================

function formatMoney(amount) {

    return new Intl.NumberFormat(
        "en-IN",
        {
            style: "currency",
            currency: "INR",
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }
    ).format(Number(amount) || 0);
}


// ============================================================
// TODAY
// ============================================================

function getToday() {

    const today = new Date();

    today.setHours(
        0,
        0,
        0,
        0
    );

    return today;
}


// ============================================================
// CHECK OVERDUE
// ============================================================

function isOverdue(transaction) {

    if (transaction.status === "paid") {
        return false;
    }

    if (!transaction.due_date) {
        return false;
    }

    const dueDate = new Date(
        transaction.due_date + "T00:00:00"
    );

    return dueDate < getToday();
}


// ============================================================
// LOAD REPORTS
// ============================================================

async function loadReports() {

    if (refreshButton) {

        refreshButton.disabled = true;
        refreshButton.textContent = "Loading...";
    }

    try {

        const {
            data,
            error
        } = await supabase

            .from("transactions")

            .select(`
                id,
                user_id,
                person_id,
                title,
                description,
                amount,
                transaction_type,
                due_date,
                status,
                created_at,
                updated_at
            `)

            .eq(
                "user_id",
                currentUser.id
            )

            .order(
                "created_at",
                {
                    ascending: true
                }
            );


        if (error) {
            throw error;
        }


        transactions = data || [];


        updateSummary();

        updateBreakdown();

        createCharts();

    }

    catch (error) {

        console.error(
            "Reports error:",
            error
        );

        alert(
            "Unable to load reports: " +
            error.message
        );

    }

    finally {

        if (refreshButton) {

            refreshButton.disabled = false;
            refreshButton.textContent = "↻ Refresh";
        }
    }
}


// ============================================================
// UPDATE SUMMARY
// ============================================================

function updateSummary() {

    let moneyReceived = 0;
    let moneyPaid = 0;
    let pending = 0;
    let overdue = 0;


    transactions.forEach(
        transaction => {

            const amount =
                Number(transaction.amount) || 0;


            // ------------------------------------------------
            // PAID
            // ------------------------------------------------

            if (
                transaction.status === "paid"
            ) {

                if (
                    transaction.transaction_type ===
                    "credit"
                ) {

                    moneyReceived += amount;

                }

                else if (
                    transaction.transaction_type ===
                    "debit"
                ) {

                    moneyPaid += amount;

                }

                return;
            }


            // ------------------------------------------------
            // PENDING
            // ------------------------------------------------

            pending += amount;


            // ------------------------------------------------
            // OVERDUE
            // ------------------------------------------------

            if (
                isOverdue(transaction)
            ) {

                overdue += amount;

            }

        }
    );


    // --------------------------------------------------------
    // UPDATE CARDS
    // --------------------------------------------------------

    if (totalReceived) {

        totalReceived.textContent =
            formatMoney(moneyReceived);

    }


    if (totalPaid) {

        totalPaid.textContent =
            formatMoney(moneyPaid);

    }


    if (totalPending) {

        totalPending.textContent =
            formatMoney(pending);

    }


    if (totalOverdue) {

        totalOverdue.textContent =
            formatMoney(overdue);

    }
}


// ============================================================
// UPDATE BREAKDOWN
// ============================================================

function updateBreakdown() {

    let credits = 0;
    let debits = 0;

    let creditTotal = 0;
    let debitTotal = 0;

    let creditPaidTotal = 0;
    let debitPaidTotal = 0;

    let creditOutstandingTotal = 0;
    let debitOutstandingTotal = 0;


    transactions.forEach(
        transaction => {

            const amount =
                Number(transaction.amount) || 0;


            if (
                transaction.transaction_type ===
                "credit"
            ) {

                credits++;

                creditTotal += amount;


                if (
                    transaction.status === "paid"
                ) {

                    creditPaidTotal += amount;

                }

                else {

                    creditOutstandingTotal +=
                        amount;

                }

            }


            else if (
                transaction.transaction_type ===
                "debit"
            ) {

                debits++;

                debitTotal += amount;


                if (
                    transaction.status === "paid"
                ) {

                    debitPaidTotal += amount;

                }

                else {

                    debitOutstandingTotal +=
                        amount;

                }

            }

        }
    );


    // --------------------------------------------------------
    // CREDIT
    // --------------------------------------------------------

    if (creditCount) {
        creditCount.textContent = credits;
    }

    if (creditAmount) {
        creditAmount.textContent =
            formatMoney(creditTotal);
    }

    if (creditPaid) {
        creditPaid.textContent =
            formatMoney(creditPaidTotal);
    }

    if (creditOutstanding) {
        creditOutstanding.textContent =
            formatMoney(creditOutstandingTotal);
    }


    // --------------------------------------------------------
    // DEBIT
    // --------------------------------------------------------

    if (debitCount) {
        debitCount.textContent = debits;
    }

    if (debitAmount) {
        debitAmount.textContent =
            formatMoney(debitTotal);
    }

    if (debitPaid) {
        debitPaid.textContent =
            formatMoney(debitPaidTotal);
    }

    if (debitOutstanding) {
        debitOutstanding.textContent =
            formatMoney(debitOutstandingTotal);
    }
}


// ============================================================
// CREATE CHARTS
// ============================================================

function createCharts() {

    createCreditDebitChart();

    createStatusChart();

    createMonthlyChart();
}


// ============================================================
// CREDIT VS DEBIT
// ============================================================

function createCreditDebitChart() {

    const canvas =
        document.getElementById(
            "creditDebitChart"
        );

    if (!canvas) {
        return;
    }

    if (creditDebitChart) {
        creditDebitChart.destroy();
    }


    let credit = 0;
    let debit = 0;


    transactions.forEach(
        transaction => {

            const amount =
                Number(transaction.amount) || 0;


            if (
                transaction.transaction_type ===
                "credit"
            ) {

                credit += amount;

            }

            else if (
                transaction.transaction_type ===
                "debit"
            ) {

                debit += amount;

            }

        }
    );


    creditDebitChart =
        new Chart(
            canvas,
            {

                type: "doughnut",

                data: {

                    labels: [
                        "Credit",
                        "Debit"
                    ],

                    datasets: [
                        {

                            data: [
                                credit,
                                debit
                            ],

                            backgroundColor: [
                                "#10b981",
                                "#ef4444"
                            ],

                            borderWidth: 0

                        }
                    ]

                },

                options: {

                    responsive: true,

                    maintainAspectRatio: false,

                    plugins: {

                        legend: {

                            position: "bottom"

                        },

                        tooltip: {

                            callbacks: {

                                label: function(context) {

                                    return (
                                        " " +
                                        formatMoney(
                                            context.raw
                                        )
                                    );

                                }

                            }

                        }

                    }

                }

            }
        );
}


// ============================================================
// PAYMENT STATUS
// ============================================================

function createStatusChart() {

    const canvas =
        document.getElementById(
            "statusChart"
        );

    if (!canvas) {
        return;
    }

    if (statusChart) {
        statusChart.destroy();
    }


    let paid = 0;
    let pending = 0;
    let overdue = 0;


    transactions.forEach(
        transaction => {

            const amount =
                Number(transaction.amount) || 0;


            if (
                transaction.status === "paid"
            ) {

                paid += amount;

            }

            else if (
                isOverdue(transaction)
            ) {

                overdue += amount;

            }

            else {

                pending += amount;

            }

        }
    );


    statusChart =
        new Chart(
            canvas,
            {

                type: "doughnut",

                data: {

                    labels: [
                        "Paid",
                        "Pending",
                        "Overdue"
                    ],

                    datasets: [
                        {

                            data: [
                                paid,
                                pending,
                                overdue
                            ],

                            backgroundColor: [
                                "#10b981",
                                "#f59e0b",
                                "#ef4444"
                            ],

                            borderWidth: 0

                        }
                    ]

                },

                options: {

                    responsive: true,

                    maintainAspectRatio: false,

                    plugins: {

                        legend: {

                            position: "bottom"

                        },

                        tooltip: {

                            callbacks: {

                                label: function(context) {

                                    return (
                                        " " +
                                        formatMoney(
                                            context.raw
                                        )
                                    );

                                }

                            }

                        }

                    }

                }

            }
        );
}


// ============================================================
// MONTHLY ACTIVITY
// ============================================================

function createMonthlyChart() {

    const canvas =
        document.getElementById(
            "monthlyChart"
        );

    if (!canvas) {
        return;
    }

    if (monthlyChart) {
        monthlyChart.destroy();
    }


    const months = [];
    const creditData = [];
    const debitData = [];


    const now = new Date();


    // --------------------------------------------------------
    // LAST 6 MONTHS
    // --------------------------------------------------------

    for (
        let i = 5;
        i >= 0;
        i--
    ) {

        const date =
            new Date(
                now.getFullYear(),
                now.getMonth() - i,
                1
            );


        const monthName =
            date.toLocaleDateString(
                "en-IN",
                {
                    month: "short"
                }
            );


        months.push(monthName);


        const year =
            date.getFullYear();

        const month =
            date.getMonth();


        let credit = 0;
        let debit = 0;


        transactions.forEach(
            transaction => {

                if (
                    !transaction.created_at
                ) {

                    return;

                }


                const created =
                    new Date(
                        transaction.created_at
                    );


                if (
                    created.getFullYear() !==
                    year
                ) {

                    return;

                }


                if (
                    created.getMonth() !==
                    month
                ) {

                    return;

                }


                const amount =
                    Number(transaction.amount) || 0;


                if (
                    transaction.transaction_type ===
                    "credit"
                ) {

                    credit += amount;

                }

                else if (
                    transaction.transaction_type ===
                    "debit"
                ) {

                    debit += amount;

                }

            }
        );


        creditData.push(credit);

        debitData.push(debit);

    }


    monthlyChart =
        new Chart(
            canvas,
            {

                type: "bar",

                data: {

                    labels: months,

                    datasets: [

                        {

                            label: "Credit",

                            data: creditData,

                            backgroundColor:
                                "#10b981",

                            borderRadius: 6

                        },

                        {

                            label: "Debit",

                            data: debitData,

                            backgroundColor:
                                "#ef4444",

                            borderRadius: 6

                        }

                    ]

                },

                options: {

                    responsive: true,

                    maintainAspectRatio: false,

                    scales: {

                        y: {

                            beginAtZero: true,

                            ticks: {

                                callback:
                                    function(value) {

                                        return (
                                            "₹" +
                                            Number(
                                                value
                                            ).toLocaleString(
                                                "en-IN"
                                            )
                                        );

                                    }

                            }

                        }

                    },

                    plugins: {

                        tooltip: {

                            callbacks: {

                                label:
                                    function(context) {

                                        return (
                                            context.dataset.label +
                                            ": " +
                                            formatMoney(
                                                context.raw
                                            )
                                        );

                                    }

                            }

                        }

                    }

                }

            }
        );
}


// ============================================================
// LOGOUT
// ============================================================

if (logoutButton) {

    logoutButton.addEventListener(
        "click",
        async () => {

            const {
                error
            } =
                await supabase.auth.signOut();


            if (error) {

                alert(
                    error.message
                );

                return;

            }


            window.location.href =
                "/login.html";

        }
    );

}


// ============================================================
// REFRESH
// ============================================================

if (refreshButton) {

    refreshButton.addEventListener(
        "click",
        loadReports
    );

}


// ============================================================
// AUTO REFRESH
// ============================================================

window.addEventListener(
    "focus",
    () => {

        if (currentUser) {

            loadReports();

        }

    }
);


document.addEventListener(
    "visibilitychange",
    () => {

        if (
            document.visibilityState === "visible" &&
            currentUser
        ) {

            loadReports();

        }

    }
);


// ============================================================
// INITIALIZE
// ============================================================

async function initialize() {

    const loggedIn =
        await checkUser();


    if (!loggedIn) {
        return;
    }


    await loadReports();

}


// ============================================================
// START
// ============================================================

initialize();