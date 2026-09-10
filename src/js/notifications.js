import { supabase } from "./supabase.js";

const notificationButton =
    document.getElementById("notificationButton");

const notificationBadge =
    document.getElementById("notificationBadge");

const notificationPanel =
    document.getElementById("notificationPanel");

const closeNotificationButton =
    document.getElementById("closeNotificationButton");

const notificationList =
    document.getElementById("notificationList");

const notificationSubtitle =
    document.getElementById("notificationSubtitle");


// --------------------------------------------------
// INITIALIZE
// --------------------------------------------------

document.addEventListener("DOMContentLoaded", () => {
    if (!notificationButton || !notificationPanel) {
        console.warn("Notification elements not found.");
        return;
    }

    notificationButton.addEventListener(
        "click",
        toggleNotificationPanel
    );

    closeNotificationButton?.addEventListener(
        "click",
        closeNotificationPanel
    );

    document.addEventListener(
        "click",
        handleOutsideClick
    );

    loadNotifications();

    // Refresh when user returns to the dashboard
    window.addEventListener(
        "focus",
        loadNotifications
    );

    window.addEventListener(
        "pageshow",
        loadNotifications
    );
});


// --------------------------------------------------
// OPEN / CLOSE PANEL
// --------------------------------------------------

function toggleNotificationPanel(event) {

    event.stopPropagation();

    const isOpen =
        notificationPanel.classList.contains("show");

    if (isOpen) {
        closeNotificationPanel();
    } else {
        openNotificationPanel();
    }
}


function openNotificationPanel() {

    notificationPanel.classList.add("show");

    loadNotifications();
}


function closeNotificationPanel() {

    notificationPanel.classList.remove("show");
}


function handleOutsideClick(event) {

    if (
        notificationPanel &&
        notificationButton &&
        !notificationPanel.contains(event.target) &&
        !notificationButton.contains(event.target)
    ) {
        closeNotificationPanel();
    }
}


// --------------------------------------------------
// LOAD NOTIFICATIONS
// --------------------------------------------------

async function loadNotifications() {

    if (!notificationList) return;

    try {

        notificationList.innerHTML = `
            <div class="notification-loading">
                Loading notifications...
            </div>
        `;

        const {
            data: {
                user
            },
            error: sessionError
        } = await supabase.auth.getUser();


        if (sessionError) {
            throw sessionError;
        }


        if (!user) {

            renderEmptyNotifications(
                "Please log in to view notifications."
            );

            updateBadge(0);

            return;
        }


        // ------------------------------------------
        // GET TRANSACTIONS
        // ------------------------------------------

        const {
            data: transactions,
            error: transactionError
        } = await supabase
            .from("transactions")
            .select(`
                id,
                title,
                amount,
                transaction_type,
                due_date,
                status,
                person_id
            `)
            .eq("user_id", user.id)
            .order("due_date", {
                ascending: true
            });


        if (transactionError) {
            throw transactionError;
        }


        // ------------------------------------------
        // GET PAYMENTS
        // ------------------------------------------

        const transactionIds =
            (transactions || []).map(
                transaction => transaction.id
            );


        let payments = [];


        if (transactionIds.length > 0) {

            const {
                data,
                error: paymentError
            } = await supabase
                .from("payments")
                .select(`
                    id,
                    transaction_id,
                    amount,
                    payment_method,
                    payment_date,
                    created_at
                `)
                .eq("user_id", user.id)
                .in(
                    "transaction_id",
                    transactionIds
                )
                .order("created_at", {
                    ascending: false
                });


            if (paymentError) {
                throw paymentError;
            }


            payments = data || [];
        }


        // ------------------------------------------
        // BUILD NOTIFICATIONS
        // ------------------------------------------

        const notifications =
            buildNotifications(
                transactions || [],
                payments
            );


        // ------------------------------------------
        // UPDATE BADGE
        // ------------------------------------------

        updateBadge(
            notifications.length
        );


        // ------------------------------------------
        // UPDATE SUBTITLE
        // ------------------------------------------

        if (notificationSubtitle) {

            if (notifications.length === 0) {

                notificationSubtitle.textContent =
                    "You're all caught up";

            } else {

                notificationSubtitle.textContent =
                    `${notifications.length} notification${
                        notifications.length === 1
                            ? ""
                            : "s"
                    }`;
            }
        }


        // ------------------------------------------
        // DISPLAY
        // ------------------------------------------

        renderNotifications(
            notifications
        );


    } catch (error) {

        console.error(
            "Notification loading error:",
            error
        );


        updateBadge(0);


        notificationList.innerHTML = `
            <div class="notification-empty">
                <div class="notification-empty-icon">
                    ⚠️
                </div>

                <p>
                    Unable to load notifications.
                </p>

                <small>
                    Please refresh the page and try again.
                </small>
            </div>
        `;
    }
}


// --------------------------------------------------
// BUILD NOTIFICATIONS
// --------------------------------------------------

function buildNotifications(
    transactions,
    payments
) {

    const notifications = [];

    const today = new Date();

    today.setHours(
        0,
        0,
        0,
        0
    );


    // ------------------------------------------
    // CALCULATE PAYMENT TOTALS
    // ------------------------------------------

    const paymentTotals = {};


    payments.forEach(payment => {

        const transactionId =
            payment.transaction_id;

        const amount =
            Number(payment.amount) || 0;


        if (!paymentTotals[transactionId]) {
            paymentTotals[transactionId] = 0;
        }


        paymentTotals[transactionId] +=
            amount;
    });


    // ------------------------------------------
    // TRANSACTION NOTIFICATIONS
    // ------------------------------------------

    transactions.forEach(transaction => {

        const amount =
            Number(transaction.amount) || 0;


        const totalPaid =
            paymentTotals[transaction.id] || 0;


        /*
         * Preserve old transactions that were
         * manually marked as paid and have no
         * payment record.
         */

        let remaining;


        if (
            transaction.status === "paid" &&
            totalPaid === 0
        ) {

            remaining = 0;

        } else {

            remaining =
                Math.max(
                    amount - totalPaid,
                    0
                );
        }


        // Fully paid
        if (remaining <= 0) {
            return;
        }


        if (!transaction.due_date) {
            return;
        }


        const dueDate =
            parseDate(transaction.due_date);


        if (!dueDate) {
            return;
        }


        const difference =
            daysBetween(
                today,
                dueDate
            );


        // --------------------------------------
        // OVERDUE
        // --------------------------------------

        if (difference < 0) {

            notifications.push({

                type: "overdue",

                priority: 1,

                title:
                    "Payment overdue",

                message:
                    `${transaction.title || "Transaction"} is overdue.`,

                amount:
                    remaining,

                transactionId:
                    transaction.id,

                dueDate:
                    transaction.due_date,

                link:
                    "/payments.html"
            });


            return;
        }


        // --------------------------------------
        // DUE TODAY
        // --------------------------------------

        if (difference === 0) {

            notifications.push({

                type: "today",

                priority: 2,

                title:
                    "Payment due today",

                message:
                    `${transaction.title || "Transaction"} is due today.`,

                amount:
                    remaining,

                transactionId:
                    transaction.id,

                dueDate:
                    transaction.due_date,

                link:
                    "/payments.html"
            });


            return;
        }


        // --------------------------------------
        // UPCOMING - NEXT 7 DAYS
        // --------------------------------------

        if (
            difference > 0 &&
            difference <= 7
        ) {

            notifications.push({

                type: "upcoming",

                priority: 3,

                title:
                    "Upcoming payment",

                message:
                    `${transaction.title || "Transaction"} is due in ${difference} day${
                        difference === 1
                            ? ""
                            : "s"
                    }.`,

                amount:
                    remaining,

                transactionId:
                    transaction.id,

                dueDate:
                    transaction.due_date,

                link:
                    "/payments.html"
            });
        }


        // --------------------------------------
        // PARTIAL PAYMENT
        // --------------------------------------

        if (
            totalPaid > 0 &&
            totalPaid < amount
        ) {

            notifications.push({

                type: "partial",

                priority: 4,

                title:
                    "Partial payment recorded",

                message:
                    `${transaction.title || "Transaction"} has a partial payment.`,

                amount:
                    remaining,

                transactionId:
                    transaction.id,

                dueDate:
                    transaction.due_date,

                link:
                    "/payments.html"
            });
        }
    });


    // ------------------------------------------
    // RECENT PAYMENTS
    // ------------------------------------------

    const now =
        Date.now();

    const recentLimit =
        24 * 60 * 60 * 1000;


    payments.forEach(payment => {

        if (!payment.created_at) {
            return;
        }


        const createdAt =
            new Date(
                payment.created_at
            ).getTime();


        if (Number.isNaN(createdAt)) {
            return;
        }


        const age =
            now - createdAt;


        if (
            age < 0 ||
            age > recentLimit
        ) {
            return;
        }


        const transaction =
            transactions.find(
                item =>
                    item.id ===
                    payment.transaction_id
            );


        if (!transaction) {
            return;
        }


        notifications.push({

            type: "payment",

            priority: 5,

            title:
                "Payment recorded",

            message:
                `Payment recorded for ${
                    transaction.title ||
                    "transaction"
                }.`,

            amount:
                Number(payment.amount) || 0,

            transactionId:
                transaction.id,

            dueDate:
                transaction.due_date,

            link:
                "/payments.html"
        });
    });


    // ------------------------------------------
    // SORT
    // ------------------------------------------

    notifications.sort(
        (a, b) => {

            if (
                a.priority !==
                b.priority
            ) {

                return (
                    a.priority -
                    b.priority
                );
            }


            return (
                new Date(
                    a.dueDate || 0
                ) -
                new Date(
                    b.dueDate || 0
                )
            );
        }
    );


    // ------------------------------------------
    // LIMIT
    // ------------------------------------------

    return notifications.slice(
        0,
        10
    );
}


// --------------------------------------------------
// RENDER NOTIFICATIONS
// --------------------------------------------------

function renderNotifications(
    notifications
) {

    if (!notificationList) {
        return;
    }


    if (
        notifications.length === 0
    ) {

        renderEmptyNotifications(
            "No new notifications"
        );

        return;
    }


    notificationList.innerHTML =
        notifications
            .map(
                notification =>
                    createNotificationHTML(
                        notification
                    )
            )
            .join("");


    // Add click events
    notificationList
        .querySelectorAll(
            ".notification-item"
        )
        .forEach(item => {

            item.addEventListener(
                "click",
                () => {

                    const link =
                        item.dataset.link;

                    if (link) {
                        window.location.href =
                            link;
                    }
                }
            );
        });
}


// --------------------------------------------------
// CREATE NOTIFICATION HTML
// --------------------------------------------------

function createNotificationHTML(
    notification
) {

    const icon =
        getNotificationIcon(
            notification.type
        );


    const formattedAmount =
        formatCurrency(
            notification.amount
        );


    const formattedDate =
        formatNotificationDate(
            notification.dueDate
        );


    return `
        <div
            class="notification-item"
            data-link="${notification.link || ""}"
        >

            <div
                class="notification-icon ${notification.type}"
            >
                ${icon}
            </div>

            <div class="notification-content">

                <div class="notification-title">
                    ${escapeHTML(
                        notification.title
                    )}
                </div>

                <div class="notification-message">
                    ${escapeHTML(
                        notification.message
                    )}
                </div>

                <div class="notification-meta">

                    ${
                        notification.amount > 0
                            ? `
                                <span class="notification-amount">
                                    ${formattedAmount}
                                </span>
                            `
                            : ""
                    }

                    ${
                        formattedDate
                            ? `
                                <span>
                                    Due ${formattedDate}
                                </span>
                            `
                            : ""
                    }

                </div>

            </div>

            <div class="notification-arrow">
                →
            </div>

        </div>
    `;
}


// --------------------------------------------------
// EMPTY STATE
// --------------------------------------------------

function renderEmptyNotifications(
    message
) {

    notificationList.innerHTML = `
        <div class="notification-empty">

            <div class="notification-empty-icon">
                ✓
            </div>

            <p>
                ${escapeHTML(message)}
            </p>

            <small>
                We'll notify you when something needs your attention.
            </small>

        </div>
    `;
}


// --------------------------------------------------
// BADGE
// --------------------------------------------------

function updateBadge(count) {

    if (!notificationBadge) {
        return;
    }


    if (count > 0) {

        notificationBadge.textContent =
            count > 9
                ? "9+"
                : count;

        notificationBadge.classList.remove(
            "hidden"
        );

    } else {

        notificationBadge.textContent =
            "0";

        notificationBadge.classList.add(
            "hidden"
        );
    }
}


// --------------------------------------------------
// ICONS
// --------------------------------------------------

function getNotificationIcon(
    type
) {

    switch (type) {

        case "overdue":
            return "⚠️";

        case "today":
            return "⏰";

        case "upcoming":
            return "📅";

        case "partial":
            return "💳";

        case "payment":
            return "✓";

        default:
            return "🔔";
    }
}


// --------------------------------------------------
// DATE HELPERS
// --------------------------------------------------

function parseDate(dateString) {

    if (!dateString) {
        return null;
    }


    const parts =
        dateString.split("-");


    if (parts.length === 3) {

        const year =
            Number(parts[0]);

        const month =
            Number(parts[1]) - 1;

        const day =
            Number(parts[2]);


        const date =
            new Date(
                year,
                month,
                day
            );


        date.setHours(
            0,
            0,
            0,
            0
        );


        return date;
    }


    const date =
        new Date(dateString);


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return null;
    }


    date.setHours(
        0,
        0,
        0,
        0
    );


    return date;
}


function daysBetween(
    startDate,
    endDate
) {

    const millisecondsPerDay =
        24 * 60 * 60 * 1000;


    return Math.round(
        (
            endDate.getTime() -
            startDate.getTime()
        ) /
        millisecondsPerDay
    );
}


// --------------------------------------------------
// CURRENCY
// --------------------------------------------------

function formatCurrency(
    amount
) {

    return new Intl.NumberFormat(
        "en-IN",
        {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 2
        }
    ).format(
        Number(amount) || 0
    );
}


// --------------------------------------------------
// DATE DISPLAY
// --------------------------------------------------

function formatNotificationDate(
    dateString
) {

    if (!dateString) {
        return "";
    }


    const date =
        parseDate(dateString);


    if (!date) {
        return "";
    }


    return date.toLocaleDateString(
        "en-IN",
        {
            day: "2-digit",
            month: "short",
            year: "numeric"
        }
    );
}


// --------------------------------------------------
// SECURITY
// --------------------------------------------------

function escapeHTML(value) {

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