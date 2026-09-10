import { supabase } from "./supabase.js";


// ============================================================
// SMARTKHATA - DASHBOARD
// ============================================================


// -------------------------
// ELEMENTS
// -------------------------

const userName = document.getElementById("userName");
const welcomeName = document.getElementById("welcomeName");
const userEmail = document.getElementById("userEmail");
const userInitial = document.getElementById("userInitial");

const totalReceive = document.getElementById("totalReceive");
const totalPay = document.getElementById("totalPay");
const totalPending = document.getElementById("totalPending");
const totalOverdue = document.getElementById("totalOverdue");

const transactionsList =
    document.getElementById("transactionsList");

const logoutButton =
    document.getElementById("logoutButton");

const addTransactionButton =
    document.getElementById("addTransactionButton");


// -------------------------
// CURRENT USER
// -------------------------

let currentUser = null;


// ============================================================
// AUTH CHECK
// ============================================================

async function checkUser() {

    const {
        data: {
            session
        },
        error
    } = await supabase.auth.getSession();


    if (error) {

        console.error(
            "Session error:",
            error
        );

        window.location.href =
            "/login.html";

        return false;
    }


    if (!session) {

        window.location.href =
            "/login.html";

        return false;
    }


    currentUser =
        session.user;


    // -------------------------
    // USER NAME
    // -------------------------

    const fullName =
        currentUser.user_metadata?.full_name ||
        "User";


    if (userName) {

        userName.textContent =
            fullName;

    }


    if (welcomeName) {

        welcomeName.textContent =
            fullName
                .split(" ")[0];

    }


    if (userEmail) {

        userEmail.textContent =
            currentUser.email;

    }


    if (userInitial) {

        userInitial.textContent =
            fullName
                .charAt(0)
                .toUpperCase();

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
    ).format(
        Number(amount) || 0
    );

}


// ============================================================
// CHECK OVERDUE
// ============================================================

function isOverdue(transaction) {

    // Paid transaction can never be overdue
    if (
        transaction.status === "paid"
    ) {

        return false;

    }


    // No due date
    if (
        !transaction.due_date
    ) {

        return false;

    }


    const today =
        new Date();

    today.setHours(
        0,
        0,
        0,
        0
    );


    const dueDate =
        new Date(
            transaction.due_date +
            "T00:00:00"
        );


    return dueDate < today;

}


// ============================================================
// LOAD DASHBOARD DATA
// ============================================================

async function loadDashboard() {

    if (!currentUser) {

        return;

    }


    try {

        // ----------------------------------------------------
        // LOAD TRANSACTIONS
        // ----------------------------------------------------

        const {
            data: transactions,
            error: transactionError
        } = await supabase
            .from("transactions")
            .select(`
                id,
                user_id,
                person_id,
                title,
                description,
                transaction_type,
                amount,
                due_date,
                status,
                created_at,
                updated_at,
                persons (
                    name
                )
            `)
            .eq(
                "user_id",
                currentUser.id
            )
            .order(
                "created_at",
                {
                    ascending: false
                }
            );


        // ----------------------------------------------------
        // HANDLE TRANSACTION ERROR
        // ----------------------------------------------------

        if (transactionError) {

            console.error(
                "Dashboard transaction error:",
                transactionError
            );

            return;

        }


        const transactionData =
            transactions || [];


        // ----------------------------------------------------
        // LOAD PAYMENT RECORDS
        // ----------------------------------------------------
        //
        // IMPORTANT:
        // Dashboard totals are now calculated from the
        // payments table as well as transactions.
        //
        // This makes Dashboard match the Payments page.
        //
        // Example:
        //
        // Transaction = ₹1,600
        // Paid        = ₹100
        // Remaining   = ₹1,500
        //
        // Dashboard To Receive = ₹1,500
        // Dashboard Pending   = ₹1,500
        //
        // ----------------------------------------------------

        let paymentRecords = [];


        if (
            transactionData.length > 0
        ) {

            const transactionIds =
                transactionData.map(
                    transaction =>
                        transaction.id
                );


            const {
                data: records,
                error: paymentError
            } = await supabase
                .from("payments")
                .select(`
                    id,
                    user_id,
                    transaction_id,
                    amount,
                    payment_date,
                    payment_method,
                    notes,
                    created_at
                `)
                .eq(
                    "user_id",
                    currentUser.id
                )
                .in(
                    "transaction_id",
                    transactionIds
                );


            if (paymentError) {

                console.error(
                    "Dashboard payment error:",
                    paymentError
                );

                return;

            }


            paymentRecords =
                records || [];

        }


        // ----------------------------------------------------
        // BUILD PAYMENT-AWARE TRANSACTIONS
        // ----------------------------------------------------

        const dashboardTransactions =
            transactionData.map(
                transaction => {

                    // ----------------------------------------
                    // Payments belonging to this transaction
                    // ----------------------------------------

                    const recordsForTransaction =
                        paymentRecords.filter(
                            record =>
                                record.transaction_id ===
                                transaction.id
                        );


                    // ----------------------------------------
                    // Total amount paid
                    // ----------------------------------------

                    const totalPaid =
                        recordsForTransaction.reduce(
                            (
                                total,
                                record
                            ) => {

                                return (
                                    total +
                                    (
                                        Number(
                                            record.amount
                                        ) || 0
                                    )
                                );

                            },
                            0
                        );


                    // ----------------------------------------
                    // Original transaction amount
                    // ----------------------------------------

                    const amount =
                        Number(
                            transaction.amount
                        ) || 0;


                    // ----------------------------------------
                    // Remaining amount
                    // ----------------------------------------

                    const remaining =
                        Math.max(
                            amount -
                            totalPaid,
                            0
                        );


                    // ----------------------------------------
                    // Determine effective status
                    // ----------------------------------------
                    //
                    // Payment records take priority.
                    //
                    // 0 paid      = pending
                    // partial     = partial
                    // full amount = paid
                    //
                    // If there are no payment records but the
                    // original transaction was already marked
                    // paid, preserve that legacy status.
                    //
                    // ----------------------------------------

                    let effectiveStatus =
                        transaction.status;


                    if (
                        totalPaid >= amount &&
                        amount > 0
                    ) {

                        effectiveStatus =
                            "paid";

                    }

                    else if (
                        totalPaid > 0
                    ) {

                        effectiveStatus =
                            "partial";

                    }

                    else if (
                        transaction.status ===
                        "paid"
                    ) {

                        effectiveStatus =
                            "paid";

                    }

                    else {

                        effectiveStatus =
                            "pending";

                    }


                    return {

                        ...transaction,

                        totalPaid,

                        remaining,

                        effectiveStatus

                    };

                }
            );


        // ====================================================
        // CALCULATE DASHBOARD TOTALS
        // ====================================================

        let receive = 0;

        let pay = 0;

        let pending = 0;

        let overdue = 0;


        dashboardTransactions.forEach(
            transaction => {

                // --------------------------------------------
                // Remaining amount
                // --------------------------------------------

                const remaining =
                    Number(
                        transaction.remaining
                    ) || 0;


                // --------------------------------------------
                // Fully paid transactions
                // --------------------------------------------
                //
                // If nothing remains, it should not appear in
                // To Receive, To Pay, Pending or Overdue.
                //
                // --------------------------------------------

                if (
                    remaining <= 0
                ) {

                    return;

                }


                // --------------------------------------------
                // CREDIT
                // Money still to receive
                // --------------------------------------------

                if (
                    transaction.transaction_type ===
                    "credit"
                ) {

                    receive +=
                        remaining;

                }


                // --------------------------------------------
                // DEBIT
                // Money still to pay
                // --------------------------------------------

                else {

                    pay +=
                        remaining;

                }


                // --------------------------------------------
                // TOTAL PENDING
                // --------------------------------------------

                pending +=
                    remaining;


                // --------------------------------------------
                // OVERDUE
                // --------------------------------------------
                //
                // Only the unpaid remaining amount should be
                // counted as overdue.
                //
                // --------------------------------------------

                if (
                    transaction.effectiveStatus !==
                    "paid" &&
                    isOverdue(
                        {
                            ...transaction,

                            status:
                                transaction.effectiveStatus
                        }
                    )
                ) {

                    overdue +=
                        remaining;

                }

            }
        );


        // ====================================================
        // UPDATE SUMMARY CARDS
        // ====================================================

        if (totalReceive) {

            totalReceive.textContent =
                formatMoney(
                    receive
                );

        }


        if (totalPay) {

            totalPay.textContent =
                formatMoney(
                    pay
                );

        }


        if (totalPending) {

            totalPending.textContent =
                formatMoney(
                    pending
                );

        }


        if (totalOverdue) {

            totalOverdue.textContent =
                formatMoney(
                    overdue
                );

        }


        // ====================================================
        // RECENT TRANSACTIONS
        // ====================================================
        //
        // Keep the existing Recent Transactions section
        // unchanged. It continues to show the original
        // transaction amounts.
        //
        // ====================================================

        renderTransactions(
            transactionData
        );


    }

    catch (error) {

        console.error(
            "Dashboard loading error:",
            error
        );

    }

}


// ============================================================
// RECENT TRANSACTIONS
// ============================================================

function renderTransactions(data) {

    if (!transactionsList) {

        return;

    }


    // --------------------------------------------------------
    // No transactions
    // --------------------------------------------------------

    if (
        !data ||
        data.length === 0
    ) {

        transactionsList.innerHTML = `

            <div class="empty-state">

                <div class="empty-state-icon">
                    💳
                </div>

                <h3>
                    No transactions yet
                </h3>

                <p>
                    Add your first transaction to see it here.
                </p>

            </div>

        `;


        return;

    }


    // --------------------------------------------------------
    // Clear existing list
    // --------------------------------------------------------

    transactionsList.innerHTML =
        "";


    // --------------------------------------------------------
    // Show latest 5
    // --------------------------------------------------------

    data
        .slice(0, 5)
        .forEach(
            transaction => {

                const row =
                    document.createElement(
                        "div"
                    );


                row.className =
                    "transaction-row";


                const personName =
                    transaction.persons?.name ||
                    "Unknown Person";


                const amount =
                    Number(
                        transaction.amount
                    ) || 0;


                const isCredit =
                    transaction.transaction_type ===
                    "credit";


                const prefix =
                    isCredit
                        ? "+"
                        : "-";


                const amountClass =
                    isCredit
                        ? "credit"
                        : "debit";


                const status =
                    transaction.status;


                // ------------------------------------------------
                // Row HTML
                // ------------------------------------------------

                row.innerHTML = `

                    <div>

                        <strong>
                            ${escapeHTML(
                                personName
                            )}
                        </strong>

                        <p>
                            ${escapeHTML(
                                transaction.title ||
                                "Untitled transaction"
                            )}
                        </p>

                    </div>


                    <div
                        class="${amountClass}"
                    >

                        ${prefix}

                        ${formatMoney(
                            amount
                        )}

                    </div>

                `;


                transactionsList.appendChild(
                    row
                );

            }
        );

}


// ============================================================
// ESCAPE HTML
// ============================================================

function escapeHTML(value) {

    if (
        value === null ||
        value === undefined
    ) {

        return "";

    }


    return String(value)

        .replace(
            /&/g,
            "&amp;"
        )

        .replace(
            /</g,
            "&lt;"
        )

        .replace(
            />/g,
            "&gt;"
        )

        .replace(
            /"/g,
            "&quot;"
        )

        .replace(
            /'/g,
            "&#039;"
        );

}


// ============================================================
// LOGOUT
// ============================================================

if (logoutButton) {

    logoutButton.addEventListener(
        "click",
        async () => {

            try {

                const {
                    error
                } =
                    await supabase.auth.signOut();


                if (error) {

                    console.error(
                        "Logout error:",
                        error
                    );


                    alert(
                        error.message
                    );


                    return;

                }


                window.location.href =
                    "/login.html";

            }


            catch (error) {

                console.error(
                    "Logout error:",
                    error
                );

            }

        }
    );

}


// ============================================================
// ADD TRANSACTION
// ============================================================

if (addTransactionButton) {

    addTransactionButton.addEventListener(
        "click",
        () => {

            window.location.href =
                "/transactions.html";

        }
    );

}


// ============================================================
// AUTO REFRESH
// ============================================================

// When user comes back to Dashboard

window.addEventListener(
    "pageshow",
    () => {

        loadDashboard();

    }
);


// When browser tab becomes active

document.addEventListener(
    "visibilitychange",
    () => {

        if (
            document.visibilityState ===
            "visible"
        ) {

            loadDashboard();

        }

    }
);


// When window gets focus

window.addEventListener(
    "focus",
    () => {

        loadDashboard();

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


    await loadDashboard();

}


// ============================================================
// START DASHBOARD
// ============================================================

initialize();