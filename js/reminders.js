// ============================================================
// SMARTKHATA - REMINDERS
// ============================================================

import { supabase } from "./supabase.js";


// ============================================================
// ELEMENTS
// ============================================================

const userName =
    document.getElementById("userName");

const userEmail =
    document.getElementById("userEmail");

const userInitial =
    document.getElementById("userInitial");

const overdueCount =
    document.getElementById("overdueCount");

const todayCount =
    document.getElementById("todayCount");

const tomorrowCount =
    document.getElementById("tomorrowCount");

const upcomingCount =
    document.getElementById("upcomingCount");

const reminderCount =
    document.getElementById("reminderCount");

const remindersList =
    document.getElementById("remindersList");

const searchInput =
    document.getElementById("searchInput");

const reminderFilter =
    document.getElementById("reminderFilter");

const logoutButton =
    document.getElementById("logoutButton");


// ============================================================
// VARIABLES
// ============================================================

let currentUser = null;

let allReminders = [];


// ============================================================
// AUTH CHECK
// ============================================================

async function checkUser() {

    const {
        data: {
            session
        },
        error
    } =
        await supabase.auth.getSession();


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


    const fullName =
        currentUser.user_metadata?.full_name ||
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
// DATE HELPERS
// ============================================================

function getToday() {

    const date =
        new Date();

    date.setHours(
        0,
        0,
        0,
        0
    );

    return date;

}


function getDateOnly(dateString) {

    if (!dateString) {

        return null;

    }


    return new Date(
        dateString +
        "T00:00:00"
    );

}


function getDaysDifference(dueDate) {

    const today =
        getToday();

    const due =
        getDateOnly(
            dueDate
        );


    if (!due) {

        return null;

    }


    const difference =
        due.getTime() -
        today.getTime();


    return Math.round(
        difference /
        (
            1000 *
            60 *
            60 *
            24
        )
    );

}


// ============================================================
// GET REMINDER TYPE
// ============================================================

function getReminderType(payment) {

    // Ignore paid transactions

    if (
        payment.status === "paid"
    ) {

        return null;

    }


    if (
        !payment.due_date
    ) {

        return null;

    }


    const days =
        getDaysDifference(
            payment.due_date
        );


    if (
        days < 0
    ) {

        return "overdue";

    }


    if (
        days === 0
    ) {

        return "today";

    }


    if (
        days === 1
    ) {

        return "tomorrow";

    }


    if (
        days >= 2 &&
        days <= 7
    ) {

        return "upcoming";

    }


    return null;

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


    const parsed =
        getDateOnly(
            date
        );


    return parsed.toLocaleDateString(
        "en-IN",
        {
            day: "2-digit",
            month: "short",
            year: "numeric"
        }
    );

}


// ============================================================
// GET INITIALS
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
            .substring(
                0,
                2
            )
            .toUpperCase();

    }


    return (
        words[0][0] +
        words[1][0]
    ).toUpperCase();

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
// LOAD REMINDERS
// ============================================================

async function loadReminders() {

    if (remindersList) {

        remindersList.innerHTML = `

            <div class="loading">
                Loading reminders...
            </div>

        `;

    }


    try {

        // ----------------------------------------------------
        // Load transactions
        // ----------------------------------------------------

        const {
            data: transactions,
            error: transactionError
        } =
            await supabase

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
                    created_at
                `)

                .eq(
                    "user_id",
                    currentUser.id
                )

                .order(
                    "due_date",
                    {
                        ascending: true
                    }
                );


        if (transactionError) {

            throw transactionError;

        }


        const transactionData =
            transactions || [];


        // ----------------------------------------------------
        // Get person IDs
        // ----------------------------------------------------

        const personIds =
            [
                ...new Set(
                    transactionData
                        .map(
                            t =>
                                t.person_id
                        )
                        .filter(Boolean)
                )
            ];


        let persons = [];


        // ----------------------------------------------------
        // Load people
        // ----------------------------------------------------

        if (
            personIds.length > 0
        ) {

            const {
                data,
                error: personError
            } =
                await supabase

                    .from("persons")

                    .select(`
                        id,
                        name
                    `)

                    .in(
                        "id",
                        personIds
                    );


            if (personError) {

                console.error(
                    "Person loading error:",
                    personError
                );

            } else {

                persons =
                    data || [];

            }

        }


        // ----------------------------------------------------
        // Create reminder data
        // ----------------------------------------------------

        allReminders =
            transactionData

                .map(
                    transaction => {

                        const person =
                            persons.find(
                                p =>
                                    p.id ===
                                    transaction.person_id
                            );


                        return {

                            ...transaction,

                            personName:
                                person?.name ||
                                "Unknown Person"

                        };

                    }
                )

                .filter(
                    transaction =>
                        getReminderType(
                            transaction
                        ) !== null
                );


        // ----------------------------------------------------
        // Update summary
        // ----------------------------------------------------

        updateSummary();


        // ----------------------------------------------------
        // Render
        // ----------------------------------------------------

        renderReminders();

    }

    catch (error) {

        console.error(
            "Reminder loading error:",
            error
        );


        if (remindersList) {

            remindersList.innerHTML = `

                <div class="empty-state">

                    <div class="empty-state-icon">
                        ⚠️
                    </div>

                    <h3>
                        Unable to load reminders
                    </h3>

                    <p>
                        ${escapeHTML(
                            error.message
                        )}
                    </p>

                </div>

            `;

        }

    }

}


// ============================================================
// UPDATE SUMMARY
// ============================================================

function updateSummary() {

    let overdue = 0;

    let today = 0;

    let tomorrow = 0;

    let upcoming = 0;


    allReminders.forEach(
        reminder => {

            const type =
                getReminderType(
                    reminder
                );


            if (
                type === "overdue"
            ) {

                overdue++;

            }

            else if (
                type === "today"
            ) {

                today++;

            }

            else if (
                type === "tomorrow"
            ) {

                tomorrow++;

            }

            else if (
                type === "upcoming"
            ) {

                upcoming++;

            }

        }
    );


    if (overdueCount) {

        overdueCount.textContent =
            overdue;

    }


    if (todayCount) {

        todayCount.textContent =
            today;

    }


    if (tomorrowCount) {

        tomorrowCount.textContent =
            tomorrow;

    }


    if (upcomingCount) {

        upcomingCount.textContent =
            upcoming;

    }

}


// ============================================================
// REMINDER TEXT
// ============================================================

function getReminderText(
    type,
    dueDate
) {

    const days =
        getDaysDifference(
            dueDate
        );


    if (
        type === "overdue"
    ) {

        const overdueDays =
            Math.abs(days);


        return overdueDays === 1
            ? "1 day overdue"
            : `${overdueDays} days overdue`;

    }


    if (
        type === "today"
    ) {

        return "Due today";

    }


    if (
        type === "tomorrow"
    ) {

        return "Due tomorrow";

    }


    if (
        type === "upcoming"
    ) {

        return `${days} days remaining`;

    }


    return "";

}


// ============================================================
// STATUS LABEL
// ============================================================

function getStatusLabel(type) {

    if (
        type === "overdue"
    ) {

        return "Overdue";

    }


    if (
        type === "today"
    ) {

        return "Due Today";

    }


    if (
        type === "tomorrow"
    ) {

        return "Tomorrow";

    }


    return "Upcoming";

}


// ============================================================
// RENDER REMINDERS
// ============================================================

function renderReminders() {

    const searchTerm =
        (
            searchInput?.value ||
            ""
        )
            .trim()
            .toLowerCase();


    const selectedFilter =
        reminderFilter?.value ||
        "all";


    const filtered =
        allReminders.filter(
            reminder => {

                const type =
                    getReminderType(
                        reminder
                    );


                // Search

                const matchesSearch =
                    !searchTerm ||

                    reminder.personName
                        ?.toLowerCase()
                        .includes(
                            searchTerm
                        ) ||

                    reminder.title
                        ?.toLowerCase()
                        .includes(
                            searchTerm
                        ) ||

                    reminder.description
                        ?.toLowerCase()
                        .includes(
                            searchTerm
                        );


                // Filter

                const matchesFilter =
                    selectedFilter === "all" ||
                    selectedFilter === type;


                return (
                    matchesSearch &&
                    matchesFilter
                );

            }
        );


    // --------------------------------------------------------
    // Count
    // --------------------------------------------------------

    if (reminderCount) {

        reminderCount.textContent =
            `${filtered.length} reminder${
                filtered.length === 1
                    ? ""
                    : "s"
            }`;

    }


    // --------------------------------------------------------
    // Empty
    // --------------------------------------------------------

    if (
        filtered.length === 0
    ) {

        if (remindersList) {

            remindersList.innerHTML = `

                <div class="empty-state">

                    <div class="empty-state-icon">
                        🎉
                    </div>

                    <h3>
                        No reminders
                    </h3>

                    <p>
                        You have no pending payment reminders in this period.
                    </p>

                </div>

            `;

        }

        return;

    }


    // --------------------------------------------------------
    // Render
    // --------------------------------------------------------

    if (remindersList) {

        remindersList.innerHTML =
            filtered
                .map(
                    createReminderHTML
                )
                .join("");

    }

}


// ============================================================
// CREATE REMINDER HTML
// ============================================================

function createReminderHTML(
    reminder
) {

    const type =
        getReminderType(
            reminder
        );


    const initials =
        getInitials(
            reminder.personName
        );


    const isCredit =
        reminder.transaction_type ===
        "credit";


    const amountClass =
        isCredit
            ? "credit"
            : "debit";


    const prefix =
        isCredit
            ? "+"
            : "-";


    const typeLabel =
        isCredit
            ? "To Receive"
            : "To Pay";


    return `

        <div
            class="reminder-row"
        >


            <!-- PERSON -->

            <div class="reminder-person">

                <div class="person-avatar">
                    ${escapeHTML(
                        initials
                    )}
                </div>


                <div class="person-details">

                    <strong>
                        ${escapeHTML(
                            reminder.personName
                        )}
                    </strong>

                    <span>
                        ${typeLabel}
                    </span>

                </div>

            </div>


            <!-- TITLE -->

            <div class="reminder-title">

                <strong>
                    ${escapeHTML(
                        reminder.title ||
                        "Untitled transaction"
                    )}
                </strong>


                ${
                    reminder.description
                        ? `
                            <span>
                                ${escapeHTML(
                                    reminder.description
                                )}
                            </span>
                        `
                        : ""
                }

            </div>


            <!-- DATE -->

            <div class="reminder-date">

                <span>
                    Due Date
                </span>

                <strong>
                    ${formatDate(
                        reminder.due_date
                    )}
                </strong>

            </div>


            <!-- AMOUNT -->

            <div
                class="reminder-amount ${amountClass}"
            >

                ${prefix}
                ${formatMoney(
                    reminder.amount
                )}

            </div>


            <!-- STATUS -->

            <div class="reminder-status">

                <span
                    class="status-badge status-${type}"
                >
                    ${getStatusLabel(
                        type
                    )}
                </span>


                <span class="days-text">

                    ${getReminderText(
                        type,
                        reminder.due_date
                    )}

                </span>

            </div>


        </div>

    `;

}


// ============================================================
// SEARCH
// ============================================================

if (searchInput) {

    searchInput.addEventListener(
        "input",
        renderReminders
    );

}


// ============================================================
// FILTER
// ============================================================

if (reminderFilter) {

    reminderFilter.addEventListener(
        "change",
        renderReminders
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
// AUTO REFRESH
// ============================================================

window.addEventListener(
    "focus",
    () => {

        loadReminders();

    }
);


document.addEventListener(
    "visibilitychange",
    () => {

        if (
            document.visibilityState ===
            "visible"
        ) {

            loadReminders();

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


    await loadReminders();

}


// ============================================================
// START
// ============================================================

initialize();