// ============================================================
// SMARTKHATA - PAYMENTS
// Partial Payments + Payment History
// ============================================================

import { supabase } from "./supabase.js";


// ============================================================
// ELEMENTS
// ============================================================

const paymentsList =
    document.getElementById("paymentsList");

const pendingAmount =
    document.getElementById("pendingAmount");

const overdueAmount =
    document.getElementById("overdueAmount");

const paidAmount =
    document.getElementById("paidAmount");

const paymentCount =
    document.getElementById("paymentCount");

const searchInput =
    document.getElementById("searchInput");

const statusFilter =
    document.getElementById("statusFilter");

const logoutButton =
    document.getElementById("logoutButton");

const profileEmail =
    document.getElementById("profileEmail");


// ============================================================
// VARIABLES
// ============================================================

let currentUser = null;
let allPayments = [];
let paymentRecords = [];


// ============================================================
// GET CURRENT USER
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


    if (profileEmail) {

        profileEmail.textContent =
            currentUser.email;
    }


    return true;
}


// ============================================================
// LOAD PAYMENTS
// ============================================================

async function loadPayments() {

    if (paymentsList) {

        paymentsList.innerHTML = `
            <div class="loading">
                Loading payments...
            </div>
        `;
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
                updated_at
            `)

            .eq(
                "user_id",
                currentUser.id
            )

            .order(
                "due_date",
                {
                    ascending: true,
                    nullsFirst: false
                }
            );


        if (transactionError) {

            throw new Error(
                "Transaction error: " +
                transactionError.message
            );
        }


        // ----------------------------------------------------
        // NO TRANSACTIONS
        // ----------------------------------------------------

        if (
            !transactions ||
            transactions.length === 0
        ) {

            allPayments = [];
            paymentRecords = [];

            updateSummary();
            renderPayments();

            return;
        }


        // ----------------------------------------------------
        // LOAD PAYMENT RECORDS
        // ----------------------------------------------------

        const transactionIds =
            transactions.map(
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
            )

            .order(
                "payment_date",
                {
                    ascending: false
                }
            );


        if (paymentError) {

            throw new Error(
                "Payment history error: " +
                paymentError.message
            );
        }


        paymentRecords =
            records || [];


        // ----------------------------------------------------
        // GET PERSON IDS
        // ----------------------------------------------------

        const personIds = [
            ...new Set(
                transactions
                    .map(
                        transaction =>
                            transaction.person_id
                    )
                    .filter(Boolean)
            )
        ];


        let persons = [];


        // ----------------------------------------------------
        // LOAD PEOPLE
        // ----------------------------------------------------

        if (
            personIds.length > 0
        ) {

            const {
                data,
                error: personError
            } = await supabase

                .from("persons")

                .select(`
                    id,
                    name,
                    phone,
                    email
                `)

                .in(
                    "id",
                    personIds
                );


            if (personError) {

                console.error(
                    "People error:",
                    personError
                );

            } else {

                persons =
                    data || [];
            }
        }


        // ----------------------------------------------------
        // BUILD PAYMENT DATA
        // ----------------------------------------------------

        allPayments =
            transactions.map(
                transaction => {

                    const person =
                        persons.find(
                            p =>
                                p.id ===
                                transaction.person_id
                        );


                    const recordsForTransaction =
                        paymentRecords.filter(
                            record =>
                                record.transaction_id ===
                                transaction.id
                        );


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


                    const transactionAmount =
                        Number(
                            transaction.amount
                        ) || 0;


                    const remaining =
                        Math.max(
                            transactionAmount -
                            totalPaid,
                            0
                        );


                    return {

                        ...transaction,

                        personName:
                            person?.name ||
                            "Unknown Person",

                        personPhone:
                            person?.phone ||
                            "",

                        personEmail:
                            person?.email ||
                            "",

                        totalPaid,

                        remaining,

                        paymentCount:
                            recordsForTransaction.length
                    };
                }
            );


        // ----------------------------------------------------
        // SYNC TRANSACTION STATUS
        // ----------------------------------------------------

        await synchronizeStatuses();


        updateSummary();

        renderPayments();

    } catch (error) {

        console.error(
            "Load payments error:",
            error
        );


        if (paymentsList) {

            paymentsList.innerHTML = `
                <div class="empty-state">

                    <div class="empty-state-icon">
                        ⚠️
                    </div>

                    <h3>
                        Unable to load payments
                    </h3>

                    <p>
                        ${escapeHTML(
                            error.message
                        )}
                    </p>

                    <button
                        class="retry-button"
                        id="retryPayments"
                    >
                        Retry
                    </button>

                </div>
            `;


            const retryButton =
                document.getElementById(
                    "retryPayments"
                );


            if (retryButton) {

                retryButton.addEventListener(
                    "click",
                    loadPayments
                );
            }
        }
    }
}


// ============================================================
// SYNCHRONIZE TRANSACTION STATUS
// ============================================================

async function synchronizeStatuses() {

    for (
        const payment of allPayments
    ) {

        const amount =
            Number(
                payment.amount
            ) || 0;

        const paid =
            Number(
                payment.totalPaid
            ) || 0;

        let newStatus =
            "pending";


        if (
            paid >= amount &&
            amount > 0
        ) {

            newStatus =
                "paid";

        } else if (
            paid > 0
        ) {

            newStatus =
                "partial";
        }


        if (
            payment.status !==
            newStatus
        ) {

            const {
                error
            } = await supabase

                .from("transactions")

                .update({

                    status:
                        newStatus,

                    updated_at:
                        new Date()
                            .toISOString()

                })

                .eq(
                    "id",
                    payment.id
                )

                .eq(
                    "user_id",
                    currentUser.id
                );


            if (error) {

                console.error(
                    "Status sync error:",
                    error
                );

            } else {

                payment.status =
                    newStatus;
            }
        }
    }
}


// ============================================================
// CHECK OVERDUE
// ============================================================

function isOverdue(payment) {

    if (
        payment.remaining <= 0
    ) {

        return false;
    }


    if (
        !payment.due_date
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
            payment.due_date +
            "T00:00:00"
        );


    return (
        dueDate <
        today
    );
}


// ============================================================
// GET EFFECTIVE STATUS
// ============================================================

function getPaymentStatus(payment) {

    // Fully paid
    if (
        payment.remaining <= 0
    ) {

        return "paid";
    }


    // Partially paid
    if (
        payment.totalPaid > 0
    ) {

        return "partial";
    }


    // Overdue
    if (
        isOverdue(payment)
    ) {

        return "overdue";
    }


    // Pending
    return "pending";
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
            minimumFractionDigits: 2
        }
    ).format(
        Number(amount) || 0
    );
}


// ============================================================
// FORMAT DATE
// ============================================================

function formatDate(date) {

    if (!date) {

        return "No due date";
    }


    const parsedDate =
        new Date(
            date +
            "T00:00:00"
        );


    return parsedDate.toLocaleDateString(
        "en-IN",
        {
            day: "2-digit",
            month: "short",
            year: "numeric"
        }
    );
}


// ============================================================
// UPDATE SUMMARY
// ============================================================

function updateSummary() {

    let pending = 0;
    let overdue = 0;
    let paid = 0;


    allPayments.forEach(
        payment => {

            const remaining =
                Number(
                    payment.remaining
                ) || 0;


            const totalPaid =
                Number(
                    payment.totalPaid
                ) || 0;


            // Amount already received/paid
            paid += totalPaid;


            // Outstanding amount
            if (
                remaining > 0
            ) {

                pending +=
                    remaining;


                if (
                    isOverdue(payment)
                ) {

                    overdue +=
                        remaining;
                }
            }
        }
    );


    if (pendingAmount) {

        pendingAmount.textContent =
            formatMoney(
                pending
            );
    }


    if (overdueAmount) {

        overdueAmount.textContent =
            formatMoney(
                overdue
            );
    }


    if (paidAmount) {

        paidAmount.textContent =
            formatMoney(
                paid
            );
    }
}


// ============================================================
// RENDER PAYMENTS
// ============================================================

function renderPayments() {

    const searchTerm =
        (
            searchInput?.value ||
            ""
        )
            .trim()
            .toLowerCase();


    const selectedStatus =
        statusFilter?.value ||
        "all";


    const filteredPayments =
        allPayments.filter(
            payment => {

                const status =
                    getPaymentStatus(
                        payment
                    );


                const matchesSearch =
                    !searchTerm ||

                    payment.title
                        ?.toLowerCase()
                        .includes(
                            searchTerm
                        ) ||

                    payment.description
                        ?.toLowerCase()
                        .includes(
                            searchTerm
                        ) ||

                    payment.personName
                        ?.toLowerCase()
                        .includes(
                            searchTerm
                        );


                const matchesStatus =
                    selectedStatus ===
                        "all" ||

                    status ===
                        selectedStatus;


                return (
                    matchesSearch &&
                    matchesStatus
                );
            }
        );


    if (paymentCount) {

        paymentCount.textContent =
            `${filteredPayments.length} payment${
                filteredPayments.length === 1
                    ? ""
                    : "s"
            }`;
    }


    if (
        filteredPayments.length === 0
    ) {

        if (paymentsList) {

            paymentsList.innerHTML = `
                <div class="empty-state">

                    <div class="empty-state-icon">
                        💳
                    </div>

                    <h3>
                        No payments found
                    </h3>

                    <p>
                        There are no payments matching your search or filter.
                    </p>

                </div>
            `;
        }

        return;
    }


    if (paymentsList) {

        paymentsList.innerHTML =
            filteredPayments
                .map(
                    createPaymentHTML
                )
                .join("");
    }
}


// ============================================================
// CREATE PAYMENT HTML
// ============================================================

function createPaymentHTML(payment) {

    const status =
        getPaymentStatus(
            payment
        );


    const initials =
        getInitials(
            payment.personName
        );


    const typeLabel =
        payment.transaction_type ===
        "credit"
            ? "To Receive"
            : "To Pay";


    const typeClass =
        payment.transaction_type ===
        "credit"
            ? "credit"
            : "debit";


    const amountPrefix =
        payment.transaction_type ===
        "credit"
            ? "+"
            : "-";


    let actionHTML = "";


    // --------------------------------------------------------
    // ACTIONS
    // --------------------------------------------------------

    if (
        status !== "paid"
    ) {

        actionHTML = `

            <button
                class="record-payment"
                data-id="${escapeHTML(
                    payment.id
                )}"
            >
                Record Payment
            </button>

        `;

    } else {

        actionHTML = `

            <span class="paid-check">
                ✓ Paid
            </span>

        `;
    }


    // --------------------------------------------------------
    // HISTORY BUTTON
    // --------------------------------------------------------

    const historyHTML = `

        <button
            class="payment-history"
            data-id="${escapeHTML(
                payment.id
            )}"
        >
            History
        </button>

    `;


    // --------------------------------------------------------
    // STATUS LABEL
    // --------------------------------------------------------

    let statusLabel =
        capitalize(
            status
        );


    // --------------------------------------------------------
    // AMOUNT DETAILS
    // --------------------------------------------------------

    const amountDetails = `

        <div class="payment-amount-main">

            ${amountPrefix}
            ${formatMoney(
                payment.amount
            )}

        </div>

        ${
            payment.totalPaid > 0 &&
            payment.remaining > 0

            ? `
                <div class="payment-remaining">
                    Paid ${formatMoney(
                        payment.totalPaid
                    )}
                    <br>
                    Remaining ${formatMoney(
                        payment.remaining
                    )}
                </div>
              `

            : payment.status === "paid"

            ? `
                <div class="payment-remaining">
                    Fully Paid
                </div>
              `

            : ""
        }

    `;


    return `

        <div
            class="payment-row"
            data-id="${escapeHTML(
                payment.id
            )}"
        >

            <!-- PERSON -->

            <div class="payment-person">

                <div class="person-avatar">
                    ${escapeHTML(
                        initials
                    )}
                </div>

                <div class="person-details">

                    <strong>
                        ${escapeHTML(
                            payment.personName
                        )}
                    </strong>

                    <span>
                        ${typeLabel}
                    </span>

                </div>

            </div>


            <!-- TITLE -->

            <div class="payment-title">

                <strong>
                    ${escapeHTML(
                        payment.title ||
                        "Untitled transaction"
                    )}
                </strong>

                ${
                    payment.description

                    ? `
                        <span>
                            ${escapeHTML(
                                payment.description
                            )}
                        </span>
                      `

                    : ""
                }

            </div>


            <!-- DATE -->

            <div class="payment-date">

                <span>
                    Due
                </span>

                <strong>
                    ${formatDate(
                        payment.due_date
                    )}
                </strong>

            </div>


            <!-- AMOUNT -->

            <div
                class="payment-amount ${typeClass}"
            >

                ${amountDetails}

            </div>


            <!-- STATUS -->

            <div class="payment-status">

                <span
                    class="status-badge status-${status}"
                >
                    ${statusLabel}
                </span>

            </div>


            <!-- ACTION -->

            <div class="payment-action">

                ${actionHTML}

                ${historyHTML}

            </div>

        </div>

    `;
}


// ============================================================
// RECORD PAYMENT
// ============================================================

async function recordPayment(
    transactionId
) {

    const transaction =
        allPayments.find(
            payment =>
                payment.id ===
                transactionId
        );


    if (!transaction) {

        alert(
            "Transaction not found."
        );

        return;
    }


    if (
        transaction.remaining <= 0
    ) {

        alert(
            "This transaction is already fully paid."
        );

        return;
    }


    showPaymentModal(
        transaction
    );
}


// ============================================================
// SHOW PAYMENT MODAL
// ============================================================

function showPaymentModal(
    transaction
) {

    removeExistingModal();


    const today =
        new Date()
            .toISOString()
            .split("T")[0];


    const modal =
        document.createElement(
            "div"
        );


    modal.id =
        "smartkhataPaymentModal";


    modal.innerHTML = `

        <div class="sk-modal-overlay">

            <div class="sk-payment-modal">

                <div class="sk-modal-header">

                    <div>

                        <h2>
                            Record Payment
                        </h2>

                        <p>
                            ${escapeHTML(
                                transaction.title ||
                                "Transaction"
                            )}
                        </p>

                    </div>

                    <button
                        type="button"
                        class="sk-modal-close"
                        id="closePaymentModal"
                    >
                        ×
                    </button>

                </div>


                <div class="sk-payment-summary">

                    <div>
                        <span>
                            Total Amount
                        </span>

                        <strong>
                            ${formatMoney(
                                transaction.amount
                            )}
                        </strong>
                    </div>


                    <div>
                        <span>
                            Already Paid
                        </span>

                        <strong>
                            ${formatMoney(
                                transaction.totalPaid
                            )}
                        </strong>
                    </div>


                    <div>
                        <span>
                            Remaining
                        </span>

                        <strong>
                            ${formatMoney(
                                transaction.remaining
                            )}
                        </strong>
                    </div>

                </div>


                <form
                    id="paymentRecordForm"
                    class="sk-payment-form"
                >

                    <label>
                        Payment Amount
                    </label>

                    <input
                        type="number"
                        id="paymentAmountInput"
                        min="0.01"
                        max="${transaction.remaining}"
                        step="0.01"
                        value="${transaction.remaining}"
                        required
                    />


                    <small>
                        Maximum:
                        ${formatMoney(
                            transaction.remaining
                        )}
                    </small>


                    <label>
                        Payment Date
                    </label>

                    <input
                        type="date"
                        id="paymentDateInput"
                        value="${today}"
                        required
                    />


                    <label>
                        Payment Method
                    </label>

                    <select id="paymentMethodInput">

    <option value="cash">
        Cash
    </option>

    <option value="upi">
        UPI
    </option>

    <option value="bank_transfer">
        Bank Transfer
    </option>

    <option value="card">
        Card
    </option>

    <option value="cheque">
        Cheque
    </option>

    <option value="other">
        Other
    </option>

</select>


                    <label>
                        Notes
                    </label>

                    <textarea
                        id="paymentNotesInput"
                        rows="3"
                        placeholder="Optional payment notes..."
                    ></textarea>


                    <div class="sk-payment-form-actions">

                        <button
                            type="button"
                            class="sk-cancel-button"
                            id="cancelPaymentModal"
                        >
                            Cancel
                        </button>

                        <button
                            type="submit"
                            class="sk-save-payment-button"
                        >
                            Save Payment
                        </button>

                    </div>

                </form>

            </div>

        </div>

    `;


    document.body.appendChild(
        modal
    );


    injectModalStyles();


    const closeButton =
        document.getElementById(
            "closePaymentModal"
        );


    const cancelButton =
        document.getElementById(
            "cancelPaymentModal"
        );


    const form =
        document.getElementById(
            "paymentRecordForm"
        );


    if (closeButton) {

        closeButton.addEventListener(
            "click",
            removeExistingModal
        );
    }


    if (cancelButton) {

        cancelButton.addEventListener(
            "click",
            removeExistingModal
        );
    }


    if (form) {

        form.addEventListener(
            "submit",
            async event => {

                event.preventDefault();


                await savePayment(
                    transaction
                );
            }
        );
    }
}


// ============================================================
// SAVE PAYMENT
// ============================================================

async function savePayment(
    transaction
) {

    const amountInput =
        document.getElementById(
            "paymentAmountInput"
        );


    const dateInput =
        document.getElementById(
            "paymentDateInput"
        );


    const methodInput =
        document.getElementById(
            "paymentMethodInput"
        );


    const notesInput =
        document.getElementById(
            "paymentNotesInput"
        );


    const saveButton =
        document.querySelector(
            ".sk-save-payment-button"
        );


    const amount =
        Number(
            amountInput?.value
        );


    const paymentDate =
        dateInput?.value;


    const paymentMethod =
    methodInput?.value ||
    "other";


    const notes =
        notesInput?.value?.trim() ||
        "";


    // --------------------------------------------------------
    // VALIDATION
    // --------------------------------------------------------

    if (
        !Number.isFinite(amount) ||
        amount <= 0
    ) {

        alert(
            "Please enter a valid payment amount."
        );

        return;
    }


    if (
        amount >
        transaction.remaining + 0.001
    ) {

        alert(
            "Payment amount cannot be greater than the remaining amount."
        );

        return;
    }


    if (!paymentDate) {

        alert(
            "Please select a payment date."
        );

        return;
    }


    // --------------------------------------------------------
    // DISABLE BUTTON
    // --------------------------------------------------------

    if (saveButton) {

        saveButton.disabled =
            true;

        saveButton.textContent =
            "Saving...";
    }


    try {

        // ----------------------------------------------------
        // INSERT PAYMENT RECORD
        // ----------------------------------------------------

        const {
            error: insertError
        } = await supabase

            .from("payments")

            .insert({

                user_id:
                    currentUser.id,

                transaction_id:
                    transaction.id,

                amount:
                    amount,

                payment_date:
                    paymentDate,

                payment_method: paymentMethod,
                notes:
                    notes

            });


        if (insertError) {

            throw new Error(
                insertError.message
            );
        }


        // ----------------------------------------------------
        // CALCULATE NEW STATUS
        // ----------------------------------------------------

        const newPaid =
            transaction.totalPaid +
            amount;


        const newRemaining =
            Math.max(
                transaction.amount -
                newPaid,
                0
            );


        let newStatus =
            "pending";


        if (
            newRemaining <= 0
        ) {

            newStatus =
                "paid";

        } else if (
            newPaid > 0
        ) {

            newStatus =
                "partial";
        }


        // ----------------------------------------------------
        // UPDATE TRANSACTION
        // ----------------------------------------------------

        const {
            error: updateError
        } = await supabase

            .from("transactions")

            .update({

                status:
                    newStatus,

                updated_at:
                    new Date()
                        .toISOString()

            })

            .eq(
                "id",
                transaction.id
            )

            .eq(
                "user_id",
                currentUser.id
            );


        if (updateError) {

            console.error(
                "Transaction status update error:",
                updateError
            );
        }


        // ----------------------------------------------------
        // CLOSE MODAL
        // ----------------------------------------------------

        removeExistingModal();


        // ----------------------------------------------------
        // RELOAD
        // ----------------------------------------------------

        await loadPayments();


        alert(
            newStatus === "paid"

                ? "Payment completed successfully."

                : "Payment recorded successfully."
        );

    } catch (error) {

        console.error(
            "Save payment error:",
            error
        );


        alert(
            "Unable to record payment:\n\n" +
            error.message
        );


        if (saveButton) {

            saveButton.disabled =
                false;

            saveButton.textContent =
                "Save Payment";
        }
    }
}


// ============================================================
// MARK AS PAID
// ============================================================

async function markAsPaid(
    transactionId
) {

    const transaction =
        allPayments.find(
            payment =>
                payment.id ===
                transactionId
        );


    if (!transaction) {

        return;
    }


    if (
        transaction.remaining <= 0
    ) {

        return;
    }


    const confirmPayment =
        confirm(
            `Record the remaining ${formatMoney(
                transaction.remaining
            )} as paid?`
        );


    if (!confirmPayment) {

        return;
    }


    await saveDirectPayment(
        transaction
    );
}


// ============================================================
// SAVE DIRECT PAYMENT
// ============================================================

async function saveDirectPayment(
    transaction
) {

    const amount =
        Number(
            transaction.remaining
        );


    try {

        // ----------------------------------------------------
        // INSERT FULL REMAINING PAYMENT
        // ----------------------------------------------------

        const {
            error: insertError
        } = await supabase

            .from("payments")

            .insert({

                user_id:
                    currentUser.id,

                transaction_id:
                    transaction.id,

                amount:
                    amount,

                payment_date:
                    new Date()
                        .toISOString()
                        .split("T")[0],

                payment_method: "other",

                notes:
                    "Marked as paid"

            });


        if (insertError) {

            throw new Error(
                insertError.message
            );
        }


        // ----------------------------------------------------
        // UPDATE TRANSACTION
        // ----------------------------------------------------

        const {
            error: updateError
        } = await supabase

            .from("transactions")

            .update({

                status:
                    "paid",

                updated_at:
                    new Date()
                        .toISOString()

            })

            .eq(
                "id",
                transaction.id
            )

            .eq(
                "user_id",
                currentUser.id
            );


        if (updateError) {

            throw new Error(
                updateError.message
            );
        }


        await loadPayments();


    } catch (error) {

        console.error(
            "Mark as paid error:",
            error
        );


        alert(
            "Unable to mark payment as paid:\n\n" +
            error.message
        );
    }
}


// ============================================================
// PAYMENT HISTORY
// ============================================================

async function showPaymentHistory(
    transactionId
) {

    const transaction =
        allPayments.find(
            payment =>
                payment.id ===
                transactionId
        );


    if (!transaction) {

        return;
    }


    const history =
        paymentRecords.filter(
            record =>
                record.transaction_id ===
                transactionId
        );


    removeExistingModal();


    const modal =
        document.createElement(
            "div"
        );


    modal.id =
        "smartkhataPaymentModal";


    let historyHTML = "";


    if (
        history.length === 0
    ) {

        historyHTML = `

            <div class="sk-history-empty">

                <div>
                    💳
                </div>

                <h3>
                    No payments recorded
                </h3>

                <p>
                    Payment history will appear here after a payment is recorded.
                </p>

            </div>

        `;

    } else {

        historyHTML =
            history
                .map(
                    (
                        record,
                        index
                    ) => `

                    <div class="sk-history-item">

                        <div class="sk-history-number">
                            ${index + 1}
                        </div>


                        <div class="sk-history-details">

                            <strong>
                                ${formatMoney(
                                    record.amount
                                )}
                            </strong>

                            <span>
                                ${formatDate(
                                    record.payment_date
                                )}
                            </span>

                            <span>
                                ${escapeHTML(
                                    record.payment_method ||
                                    "Other"
                                )}
                            </span>

                            ${
                                record.notes

                                ? `
                                    <p>
                                        ${escapeHTML(
                                            record.notes
                                        )}
                                    </p>
                                  `

                                : ""
                            }

                        </div>

                    </div>

                `
                )
                .join("");
    }


    modal.innerHTML = `

        <div class="sk-modal-overlay">

            <div class="sk-payment-modal sk-history-modal">

                <div class="sk-modal-header">

                    <div>

                        <h2>
                            Payment History
                        </h2>

                        <p>
                            ${escapeHTML(
                                transaction.title ||
                                "Transaction"
                            )}
                        </p>

                    </div>

                    <button
                        type="button"
                        class="sk-modal-close"
                        id="closePaymentHistory"
                    >
                        ×
                    </button>

                </div>


                <div class="sk-history-summary">

                    <div>
                        <span>
                            Total
                        </span>

                        <strong>
                            ${formatMoney(
                                transaction.amount
                            )}
                        </strong>
                    </div>


                    <div>
                        <span>
                            Paid
                        </span>

                        <strong>
                            ${formatMoney(
                                transaction.totalPaid
                            )}
                        </strong>
                    </div>


                    <div>
                        <span>
                            Remaining
                        </span>

                        <strong>
                            ${formatMoney(
                                transaction.remaining
                            )}
                        </strong>
                    </div>

                </div>


                <div class="sk-history-list">

                    ${historyHTML}

                </div>

            </div>

        </div>

    `;


    document.body.appendChild(
        modal
    );


    injectModalStyles();


    const closeButton =
        document.getElementById(
            "closePaymentHistory"
        );


    if (closeButton) {

        closeButton.addEventListener(
            "click",
            removeExistingModal
        );
    }
}


// ============================================================
// REMOVE MODAL
// ============================================================

function removeExistingModal() {

    const modal =
        document.getElementById(
            "smartkhataPaymentModal"
        );


    if (modal) {

        modal.remove();
    }
}


// ============================================================
// INITIALS
// ============================================================

function getInitials(name) {

    if (!name) {

        return "P";
    }


    const words =
        name
            .trim()
            .split(/\s+/);


    if (
        words.length === 1
    ) {

        return words[0]
            .substring(0, 2)
            .toUpperCase();
    }


    return (
        words[0][0] +
        words[1][0]
    ).toUpperCase();
}


// ============================================================
// CAPITALIZE
// ============================================================

function capitalize(value) {

    if (!value) {

        return "";
    }


    return (
        value.charAt(0).toUpperCase() +
        value.slice(1)
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
// EVENT DELEGATION
// ============================================================

if (paymentsList) {

    paymentsList.addEventListener(
        "click",
        event => {

            const recordButton =
                event.target.closest(
                    ".record-payment"
                );


            if (recordButton) {

                recordPayment(
                    recordButton.dataset.id
                );

                return;
            }


            const historyButton =
                event.target.closest(
                    ".payment-history"
                );


            if (historyButton) {

                showPaymentHistory(
                    historyButton.dataset.id
                );

                return;
            }
        }
    );
}


// ============================================================
// SEARCH
// ============================================================

if (searchInput) {

    searchInput.addEventListener(
        "input",
        renderPayments
    );
}


// ============================================================
// STATUS FILTER
// ============================================================

if (statusFilter) {

    statusFilter.addEventListener(
        "change",
        renderPayments
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
// MODAL STYLES
// ============================================================

function injectModalStyles() {

    if (
        document.getElementById(
            "smartkhataPaymentStyles"
        )
    ) {

        return;
    }


    const style =
        document.createElement(
            "style"
        );


    style.id =
        "smartkhataPaymentStyles";


    style.textContent = `

        .sk-modal-overlay {
            position: fixed;
            inset: 0;
            background: rgba(0,0,0,.65);
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
            z-index: 99999;
        }


        .sk-payment-modal {
            width: min(520px, 100%);
            max-height: 90vh;
            overflow-y: auto;
            background: #ffffff;
            border-radius: 18px;
            box-shadow: 0 25px 70px rgba(0,0,0,.35);
            padding: 24px;
        }


        .sk-modal-header {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 15px;
            margin-bottom: 20px;
        }


        .sk-modal-header h2 {
            margin: 0 0 5px;
            font-size: 22px;
        }


        .sk-modal-header p {
            margin: 0;
            color: #6b7280;
            font-size: 14px;
        }


        .sk-modal-close {
            border: none;
            background: transparent;
            font-size: 28px;
            cursor: pointer;
            line-height: 1;
            color: #6b7280;
        }


        .sk-payment-summary,
        .sk-history-summary {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 10px;
            margin-bottom: 22px;
        }


        .sk-payment-summary > div,
        .sk-history-summary > div {
            background: #f6f7f9;
            border-radius: 12px;
            padding: 12px;
        }


        .sk-payment-summary span,
        .sk-history-summary span {
            display: block;
            font-size: 12px;
            color: #6b7280;
            margin-bottom: 5px;
        }


        .sk-payment-summary strong,
        .sk-history-summary strong {
            font-size: 14px;
        }


        .sk-payment-form label {
            display: block;
            margin: 15px 0 7px;
            font-size: 14px;
            font-weight: 600;
        }


        .sk-payment-form input,
        .sk-payment-form select,
        .sk-payment-form textarea {
            width: 100%;
            box-sizing: border-box;
            padding: 11px 12px;
            border: 1px solid #d7dbe2;
            border-radius: 9px;
            font: inherit;
            background: #fff;
        }


        .sk-payment-form textarea {
            resize: vertical;
        }


        .sk-payment-form small {
            display: block;
            margin-top: 5px;
            color: #6b7280;
        }


        .sk-payment-form-actions {
            display: flex;
            justify-content: flex-end;
            gap: 10px;
            margin-top: 22px;
        }


        .sk-cancel-button,
        .sk-save-payment-button {
            border: none;
            border-radius: 9px;
            padding: 11px 18px;
            cursor: pointer;
            font-weight: 600;
        }


        .sk-cancel-button {
            background: #eef0f3;
            color: #374151;
        }


        .sk-save-payment-button {
            background: #111827;
            color: white;
        }


        .sk-save-payment-button:disabled {
            opacity: .6;
            cursor: not-allowed;
        }


        .sk-history-list {
            display: flex;
            flex-direction: column;
            gap: 10px;
        }


        .sk-history-item {
            display: flex;
            align-items: flex-start;
            gap: 12px;
            border: 1px solid #e5e7eb;
            border-radius: 12px;
            padding: 13px;
        }


        .sk-history-number {
            width: 30px;
            height: 30px;
            border-radius: 50%;
            background: #eef2ff;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 700;
            flex-shrink: 0;
        }


        .sk-history-details {
            display: flex;
            flex-direction: column;
            gap: 3px;
        }


        .sk-history-details strong {
            font-size: 16px;
        }


        .sk-history-details span {
            font-size: 13px;
            color: #6b7280;
        }


        .sk-history-details p {
            margin: 5px 0 0;
            font-size: 13px;
            color: #374151;
        }


        .sk-history-empty {
            text-align: center;
            padding: 35px 15px;
            color: #6b7280;
        }


        .sk-history-empty > div {
            font-size: 40px;
            margin-bottom: 10px;
        }


        .sk-history-empty h3 {
            margin: 0 0 6px;
            color: #111827;
        }


        .sk-history-empty p {
            margin: 0;
            font-size: 14px;
        }


        .payment-remaining {
            font-size: 11px;
            margin-top: 4px;
            color: #6b7280;
            line-height: 1.4;
        }


        .payment-amount-main {
            font-weight: 700;
        }


        .record-payment,
        .payment-history {
            border: none;
            border-radius: 7px;
            padding: 7px 10px;
            cursor: pointer;
            font-size: 12px;
            font-weight: 600;
            margin: 2px;
        }


        .record-payment {
            background: #111827;
            color: #fff;
        }


        .payment-history {
            background: #eef0f3;
            color: #374151;
        }


        .retry-button {
            border: none;
            background: #111827;
            color: white;
            padding: 10px 18px;
            border-radius: 8px;
            cursor: pointer;
            margin-top: 10px;
        }


        @media (max-width: 600px) {

            .sk-payment-modal {
                padding: 18px;
                border-radius: 14px;
            }


            .sk-payment-summary,
            .sk-history-summary {
                grid-template-columns: 1fr;
            }


            .sk-payment-form-actions {
                flex-direction: column-reverse;
            }


            .sk-cancel-button,
            .sk-save-payment-button {
                width: 100%;
            }
        }

    `;


    document.head.appendChild(
        style
    );
}


// ============================================================
// INITIALIZE
// ============================================================

async function initialize() {

    const loggedIn =
        await checkUser();


    if (!loggedIn) {

        return;
    }


    await loadPayments();
}


// ============================================================
// START
// ============================================================

initialize();