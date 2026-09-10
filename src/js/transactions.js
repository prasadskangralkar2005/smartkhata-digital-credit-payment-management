import { supabase } from "./supabase.js";


// ============================================================
// ELEMENTS
// ============================================================

const formCard =
    document.getElementById("transactionFormCard");

const transactionForm =
    document.getElementById("transactionForm");

const addButton =
    document.getElementById("addTransactionButton");

const closeButton =
    document.getElementById("closeFormButton");

const cancelButton =
    document.getElementById("cancelButton");

const creditButton =
    document.getElementById("creditButton");

const debitButton =
    document.getElementById("debitButton");

const personSelect =
    document.getElementById("person");

const titleInput =
    document.getElementById("title");

const amountInput =
    document.getElementById("amount");

const dueDateInput =
    document.getElementById("dueDate");

const descriptionInput =
    document.getElementById("description");

const saveButton =
    document.getElementById("saveButton");

const transactionsList =
    document.getElementById("transactionsList");

const transactionCount =
    document.getElementById("transactionCount");

const searchInput =
    document.getElementById("searchInput");

const userName =
    document.getElementById("userName");

const userEmail =
    document.getElementById("userEmail");

const userInitial =
    document.getElementById("userInitial");

const logoutButton =
    document.getElementById("logoutButton");

const sidebar =
    document.getElementById("sidebar");

const menuButton =
    document.getElementById("menuButton");

const sidebarOverlay =
    document.getElementById("sidebarOverlay");


// ============================================================
// STATE
// ============================================================

let currentUser = null;

let people = [];

let transactions = [];

let transactionType = "credit";


// ============================================================
// AUTHENTICATION
// ============================================================

async function loadUser() {

    const {
        data: {
            session
        }
    } = await supabase.auth.getSession();


    if (!session) {

        window.location.href =
            "/login.html";

        return false;

    }


    currentUser = session.user;


    const fullName =
        currentUser.user_metadata?.full_name ||
        currentUser.email?.split("@")[0] ||
        "User";


    if (userName) {
        userName.textContent =
            fullName;
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
// LOAD PEOPLE
// ============================================================

async function loadPeople() {

    const {
        data,
        error
    } = await supabase

        .from("persons")

        .select(
            "id, name, phone"
        )

        .eq(
            "user_id",
            currentUser.id
        )

        .order(
            "name",
            {
                ascending: true
            }
        );


    if (error) {

        console.error(error);

        alert(
            "Unable to load people: " +
            error.message
        );

        return;

    }


    people = data || [];


    personSelect.innerHTML = `

        <option value="">
            Select a person
        </option>

        ${
            people
                .map(person => `

                    <option value="${person.id}">
                        ${escapeHtml(person.name)}
                        ${
                            person.phone
                                ? ` - ${escapeHtml(person.phone)}`
                                : ""
                        }
                    </option>

                `)
                .join("")
        }

    `;

}


// ============================================================
// LOAD TRANSACTIONS
// ============================================================

async function loadTransactions() {

    transactionsList.innerHTML = `
        <div class="loading">
            Loading transactions...
        </div>
    `;


    const {
        data,
        error
    } = await supabase

        .from("transactions")

        .select(`
            id,
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
                name,
                phone
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


    if (error) {

        console.error(error);

        transactionsList.innerHTML = `

            <div class="empty-state">

                <div class="empty-state-icon">
                    ⚠️
                </div>

                <h3>
                    Unable to load transactions
                </h3>

                <p>
                    ${escapeHtml(error.message)}
                </p>

            </div>

        `;

        return;

    }


    transactions = data || [];

    renderTransactions();

}


// ============================================================
// RENDER TRANSACTIONS
// ============================================================

function renderTransactions() {

    const search =
        searchInput.value
            .trim()
            .toLowerCase();


    const filtered =
        transactions.filter(transaction => {

            const personName =
                transaction.persons?.name || "";


            return (

                transaction.title
                    ?.toLowerCase()
                    .includes(search)

                ||

                personName
                    .toLowerCase()
                    .includes(search)

                ||

                transaction.description
                    ?.toLowerCase()
                    .includes(search)

            );

        });


    transactionCount.textContent =
        `${filtered.length} ${
            filtered.length === 1
                ? "transaction"
                : "transactions"
        }`;


    if (filtered.length === 0) {

        transactionsList.innerHTML = `

            <div class="empty-state">

                <div class="empty-state-icon">
                    🧾
                </div>

                <h3>
                    ${
                        search
                            ? "No matching transactions"
                            : "No transactions yet"
                    }
                </h3>

                <p>
                    ${
                        search
                            ? "Try another search."
                            : "Add your first transaction to get started."
                    }
                </p>

            </div>

        `;

        return;

    }


    transactionsList.innerHTML =
        filtered
            .map(createTransactionHTML)
            .join("");

}


// ============================================================
// CREATE TRANSACTION HTML
// ============================================================

function createTransactionHTML(transaction) {

    const personName =
        transaction.persons?.name ||
        "Unknown";


    const initial =
        personName
            .charAt(0)
            .toUpperCase();


    const isCredit =
        transaction.transaction_type ===
        "credit";


    const formattedAmount =
        Number(
            transaction.amount
        ).toLocaleString(
            "en-IN",
            {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }
        );


    const dueDate =
        transaction.due_date
            ? formatDate(
                transaction.due_date
            )
            : "No due date";


    return `

        <div class="transaction-row">

            <div class="transaction-person">

                <div class="transaction-avatar">
                    ${escapeHtml(initial)}
                </div>

                <div>

                    <div class="transaction-title">
                        ${escapeHtml(transaction.title)}
                    </div>

                    <small>
                        ${escapeHtml(personName)}
                    </small>

                </div>

            </div>


            <div>

                <span class="${
                    isCredit
                        ? "credit-text"
                        : "debit-text"
                }">

                    ${
                        isCredit
                            ? "↓ Credit"
                            : "↑ Debit"
                    }

                </span>

            </div>


            <div>

                <strong>
                    ₹${formattedAmount}
                </strong>

            </div>


            <div>

                <span class="status ${
                    transaction.status
                }">

                    ${escapeHtml(
                        capitalize(
                            transaction.status
                        )
                    )}

                </span>

                <small
                    style="
                        display:block;
                        margin-top:4px;
                        color:#8992a5;
                    "
                >
                    ${dueDate}
                </small>

            </div>


            <div>

                <button
                    class="edit-transaction"
                    onclick="editTransaction('${transaction.id}')"
                    title="Edit"
                    type="button"
                >
                    ✏️
                </button>

                <button
                    class="delete-transaction"
                    onclick="deleteTransaction('${transaction.id}')"
                    title="Delete"
                    type="button"
                >
                    🗑️
                </button>

            </div>

        </div>

    `;

}


// ============================================================
// CREDIT / DEBIT SELECTION
// ============================================================

function selectTransactionType(type) {

    transactionType = type;


    if (type === "credit") {

        creditButton.classList.add(
            "selected"
        );

        debitButton.classList.remove(
            "selected"
        );

    } else {

        debitButton.classList.add(
            "selected"
        );

        creditButton.classList.remove(
            "selected"
        );

    }

}


// ============================================================
// CREDIT BUTTON
// ============================================================

creditButton.addEventListener(
    "click",
    function (event) {

        event.preventDefault();

        selectTransactionType("credit");

    }
);


// ============================================================
// DEBIT BUTTON
// ============================================================

debitButton.addEventListener(
    "click",
    function (event) {

        event.preventDefault();

        selectTransactionType("debit");

    }
);


// ============================================================
// OPEN FORM
// ============================================================

addButton.addEventListener(
    "click",
    async () => {

        await loadPeople();

        transactionForm.reset();

        transactionForm.removeAttribute(
            "data-editing-id"
        );

        saveButton.textContent =
            "Save Transaction";

        transactionType =
            "credit";

        creditButton.classList.add(
            "selected"
        );

        debitButton.classList.remove(
            "selected"
        );

        formCard.classList.remove(
            "hidden"
        );

        personSelect.focus();

    }
);


// ============================================================
// CLOSE FORM
// ============================================================

function closeForm() {

    formCard.classList.add(
        "hidden"
    );

    transactionForm.reset();

    transactionForm.removeAttribute(
        "data-editing-id"
    );

    saveButton.textContent =
        "Save Transaction";

    transactionType =
        "credit";

    creditButton.classList.add(
        "selected"
    );

    debitButton.classList.remove(
        "selected"
    );

}


// ============================================================
// CLOSE BUTTON
// ============================================================

closeButton.addEventListener(
    "click",
    closeForm
);


// ============================================================
// CANCEL BUTTON
// ============================================================

cancelButton.addEventListener(
    "click",
    closeForm
);


// ============================================================
// SAVE / UPDATE TRANSACTION
// ============================================================

transactionForm.addEventListener(
    "submit",
    async event => {

        event.preventDefault();


        const personId =
            personSelect.value;


        const title =
            titleInput.value.trim();


        const amount =
            Number(
                amountInput.value
            );


        const dueDate =
            dueDateInput.value ||
            null;


        const description =
            descriptionInput.value.trim();


        // ====================================================
        // VALIDATION
        // ====================================================

        if (!personId) {

            alert(
                "Please select a person."
            );

            return;

        }


        if (!title) {

            alert(
                "Please enter a title."
            );

            titleInput.focus();

            return;

        }


        if (
            !amount ||
            amount <= 0
        ) {

            alert(
                "Amount must be greater than zero."
            );

            amountInput.focus();

            return;

        }


        // ====================================================
        // BUTTON STATE
        // ====================================================

        saveButton.disabled =
            true;

        saveButton.textContent =
            transactionForm.dataset.editingId
                ? "Updating..."
                : "Saving...";


        // ====================================================
        // CHECK EDIT MODE
        // ====================================================

        const editingId =
            transactionForm.dataset.editingId;


        let error;


        // ====================================================
        // UPDATE EXISTING TRANSACTION
        // ====================================================

        if (editingId) {

            const result =
                await supabase

                    .from("transactions")

                    .update({

                        person_id:
                            personId,

                        title,

                        description:
                            description ||
                            null,

                        transaction_type:
                            transactionType,

                        amount,

                        due_date:
                            dueDate,

                        updated_at:
                            new Date()
                                .toISOString()

                    })

                    .eq(
                        "id",
                        editingId
                    )

                    .eq(
                        "user_id",
                        currentUser.id
                    );


            error =
                result.error;

        }


        // ====================================================
        // INSERT NEW TRANSACTION
        // ====================================================

        else {

            const result =
                await supabase

                    .from("transactions")

                    .insert({

                        user_id:
                            currentUser.id,

                        person_id:
                            personId,

                        title,

                        description:
                            description ||
                            null,

                        transaction_type:
                            transactionType,

                        amount,

                        due_date:
                            dueDate,

                        status:
                            "pending"

                    });


            error =
                result.error;

        }


        // ====================================================
        // ERROR HANDLING
        // ====================================================

        if (error) {

            console.error(error);

            alert(
                "Unable to save transaction:\n\n" +
                error.message
            );

            saveButton.disabled =
                false;

            saveButton.textContent =
                editingId
                    ? "Update Transaction"
                    : "Save Transaction";

            return;

        }


        // ====================================================
        // SUCCESS
        // ====================================================

        transactionForm.removeAttribute(
            "data-editing-id"
        );

        saveButton.textContent =
            "Save Transaction";

        closeForm();

        await loadTransactions();

    }
);


// ============================================================
// EDIT TRANSACTION
// ============================================================

window.editTransaction =
    async function (transactionId) {

        const transaction =
            transactions.find(
                item =>
                    item.id ===
                    transactionId
            );


        if (!transaction) {

            alert(
                "Transaction not found."
            );

            return;

        }


        // Load current people
        await loadPeople();


        // Fill form
        personSelect.value =
            transaction.person_id ||
            "";


        titleInput.value =
            transaction.title ||
            "";


        amountInput.value =
            transaction.amount ||
            "";


        dueDateInput.value =
            transaction.due_date ||
            "";


        descriptionInput.value =
            transaction.description ||
            "";


        // Set type
        transactionType =
            transaction.transaction_type;


        if (
            transactionType ===
            "credit"
        ) {

            creditButton.classList.add(
                "selected"
            );

            debitButton.classList.remove(
                "selected"
            );

        } else {

            debitButton.classList.add(
                "selected"
            );

            creditButton.classList.remove(
                "selected"
            );

        }


        // Store transaction ID
        transactionForm.dataset.editingId =
            transactionId;


        // Change button
        saveButton.textContent =
            "Update Transaction";


        // Show form
        formCard.classList.remove(
            "hidden"
        );


        personSelect.focus();

    };


// ============================================================
// DELETE TRANSACTION
// ============================================================

window.deleteTransaction =
    async function (transactionId) {

        const transaction =
            transactions.find(
                item =>
                    item.id ===
                    transactionId
            );


        if (!transaction) {

            return;

        }


        const confirmed =
            confirm(
                `Delete "${transaction.title}"?`
            );


        if (!confirmed) {

            return;

        }


        const {
            error
        } = await supabase

            .from("transactions")

            .delete()

            .eq(
                "id",
                transactionId
            )

            .eq(
                "user_id",
                currentUser.id
            );


        if (error) {

            console.error(error);

            alert(
                "Unable to delete transaction:\n\n" +
                error.message
            );

            return;

        }


        await loadTransactions();

    };


// ============================================================
// SEARCH
// ============================================================

searchInput.addEventListener(
    "input",
    renderTransactions
);


// ============================================================
// LOGOUT
// ============================================================

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


// ============================================================
// MOBILE MENU
// ============================================================

menuButton.addEventListener(
    "click",
    () => {

        sidebar.classList.add(
            "open"
        );

        sidebarOverlay.classList.add(
            "active"
        );

    }
);


sidebarOverlay.addEventListener(
    "click",
    () => {

        sidebar.classList.remove(
            "open"
        );

        sidebarOverlay.classList.remove(
            "active"
        );

    }
);


// ============================================================
// HELPERS
// ============================================================

function formatDate(date) {

    return new Date(
        date + "T00:00:00"
    ).toLocaleDateString(
        "en-IN",
        {
            day: "2-digit",
            month: "short",
            year: "numeric"
        }
    );

}


function capitalize(value) {

    return value
        .charAt(0)
        .toUpperCase() +
        value.slice(1);

}


function escapeHtml(value) {

    return String(value ?? "")
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
// START
// ============================================================

const authenticated =
    await loadUser();


if (authenticated) {

    await loadPeople();

    await loadTransactions();

}