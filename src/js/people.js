import { supabase } from "./supabase.js";


// ============================================================
// ELEMENTS
// ============================================================

const peopleList =
    document.getElementById("peopleList");

const peopleCount =
    document.getElementById("peopleCount");

const searchInput =
    document.getElementById("searchInput");

const personFormCard =
    document.getElementById("personFormCard");

const personForm =
    document.getElementById("personForm");

const addPersonButton =
    document.getElementById("addPersonButton");

const closeFormButton =
    document.getElementById("closeFormButton");

const cancelButton =
    document.getElementById("cancelButton");

const formTitle =
    document.getElementById("formTitle");

const saveButton =
    document.getElementById("saveButton");

const nameInput =
    document.getElementById("name");

const phoneInput =
    document.getElementById("phone");

const emailInput =
    document.getElementById("email");

const addressInput =
    document.getElementById("address");

const notesInput =
    document.getElementById("notes");

const logoutButton =
    document.getElementById("logoutButton");

const userName =
    document.getElementById("userName");

const userEmail =
    document.getElementById("userEmail");

const userInitial =
    document.getElementById("userInitial");

const menuButton =
    document.getElementById("menuButton");

const sidebar =
    document.getElementById("sidebar");

const sidebarOverlay =
    document.getElementById("sidebarOverlay");


// ============================================================
// STATE
// ============================================================

let currentUser = null;

let people = [];

let editingPersonId = null;



// ============================================================
// GET LOGGED-IN USER
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


    userName.textContent =
        fullName;

    userEmail.textContent =
        currentUser.email;

    userInitial.textContent =
        fullName
            .charAt(0)
            .toUpperCase();


    return true;

}



// ============================================================
// LOAD PEOPLE
// ============================================================

async function loadPeople() {

    peopleList.innerHTML = `
        <div class="loading">
            Loading people...
        </div>
    `;


    const {
        data,
        error
    } = await supabase

        .from("persons")

        .select(
            "id, user_id, name, phone, email, address, notes, created_at, updated_at"
        )

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

        peopleList.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">
                    ⚠️
                </div>

                <h3>
                    Unable to load people
                </h3>

                <p>
                    ${escapeHtml(error.message)}
                </p>
            </div>
        `;

        return;

    }


    people = data || [];

    renderPeople();

}



// ============================================================
// RENDER PEOPLE
// ============================================================

function renderPeople() {

    const searchTerm =
        searchInput.value
            .trim()
            .toLowerCase();


    const filteredPeople =
        people.filter(person => {

            return (

                person.name
                    ?.toLowerCase()
                    .includes(searchTerm)

                ||

                person.phone
                    ?.toLowerCase()
                    .includes(searchTerm)

                ||

                person.email
                    ?.toLowerCase()
                    .includes(searchTerm)

            );

        });


    peopleCount.textContent =
        `${filteredPeople.length} ${
            filteredPeople.length === 1
                ? "person"
                : "people"
        }`;


    if (filteredPeople.length === 0) {

        peopleList.innerHTML = `

            <div class="empty-state">

                <div class="empty-state-icon">
                    👥
                </div>

                <h3>
                    ${
                        searchTerm
                            ? "No matching people"
                            : "No people added yet"
                    }
                </h3>

                <p>
                    ${
                        searchTerm
                            ? "Try a different search."
                            : "Add your first person to get started."
                    }
                </p>

            </div>

        `;

        return;

    }


    peopleList.innerHTML =
        filteredPeople
            .map(createPersonHTML)
            .join("");

}



// ============================================================
// CREATE PERSON HTML
// ============================================================

function createPersonHTML(person) {

    const initial =
        person.name
            ?.charAt(0)
            .toUpperCase() || "?";


    return `

        <div
            class="person-row"
            data-id="${person.id}"
        >

            <div class="person-main">

                <div class="person-avatar">
                    ${escapeHtml(initial)}
                </div>


                <div class="person-info">

                    <h3>
                        ${escapeHtml(person.name)}
                    </h3>

                    <p>
                        ${
                            person.notes
                                ? escapeHtml(person.notes)
                                : "No notes"
                        }
                    </p>

                </div>

            </div>


            <div class="person-contact">

                ${
                    person.phone
                        ? `<span>📞 ${escapeHtml(person.phone)}</span>`
                        : ""
                }

                ${
                    person.email
                        ? `<span>✉️ ${escapeHtml(person.email)}</span>`
                        : ""
                }

                ${
                    person.address
                        ? `<span>📍 ${escapeHtml(person.address)}</span>`
                        : ""
                }

            </div>


            <div class="person-actions">

                <button
                    class="action-button"
                    onclick="editPerson('${person.id}')"
                    title="Edit"
                >
                    ✏️
                </button>


                <button
                    class="action-button delete-button"
                    onclick="deletePerson('${person.id}')"
                    title="Delete"
                >
                    🗑️
                </button>

            </div>

        </div>

    `;

}



// ============================================================
// OPEN ADD FORM
// ============================================================

function openAddForm() {

    editingPersonId = null;

    formTitle.textContent =
        "Add Person";

    saveButton.textContent =
        "Save Person";

    personForm.reset();

    personFormCard.classList.remove(
        "hidden"
    );

    nameInput.focus();

}



// ============================================================
// OPEN EDIT FORM
// ============================================================

window.editPerson = function(personId) {

    const person =
        people.find(
            item => item.id === personId
        );


    if (!person) {

        return;

    }


    editingPersonId =
        personId;


    formTitle.textContent =
        "Edit Person";

    saveButton.textContent =
        "Update Person";


    nameInput.value =
        person.name || "";

    phoneInput.value =
        person.phone || "";

    emailInput.value =
        person.email || "";

    addressInput.value =
        person.address || "";

    notesInput.value =
        person.notes || "";


    personFormCard.classList.remove(
        "hidden"
    );


    nameInput.focus();

};



// ============================================================
// CLOSE FORM
// ============================================================

function closeForm() {

    editingPersonId = null;

    personForm.reset();

    personFormCard.classList.add(
        "hidden"
    );

}



// ============================================================
// SAVE / UPDATE PERSON
// ============================================================

personForm.addEventListener(
    "submit",
    async event => {

        event.preventDefault();


        const name =
            nameInput.value.trim();

        const phone =
            phoneInput.value.trim();

        const email =
            emailInput.value.trim();

        const address =
            addressInput.value.trim();

        const notes =
            notesInput.value.trim();


        if (!name) {

            alert(
                "Please enter the person's name."
            );

            nameInput.focus();

            return;

        }


        saveButton.disabled = true;

        saveButton.textContent =
            editingPersonId
                ? "Updating..."
                : "Saving...";


        const personData = {

            name,

            phone:
                phone || null,

            email:
                email || null,

            address:
                address || null,

            notes:
                notes || null

        };


        let result;


        // ====================================================
        // UPDATE
        // ====================================================

        if (editingPersonId) {

            result =
                await supabase

                    .from("persons")

                    .update(personData)

                    .eq(
                        "id",
                        editingPersonId
                    )

                    .eq(
                        "user_id",
                        currentUser.id
                    );

        }


        // ====================================================
        // INSERT
        // ====================================================

        else {

            result =
                await supabase

                    .from("persons")

                    .insert({

                        user_id:
                            currentUser.id,

                        ...personData

                    });

        }


        if (result.error) {

            console.error(
                result.error
            );


            alert(
                result.error.message
            );


            saveButton.disabled =
                false;

            saveButton.textContent =
                editingPersonId
                    ? "Update Person"
                    : "Save Person";


            return;

        }


        closeForm();

        await loadPeople();

    }
);



// ============================================================
// DELETE PERSON
// ============================================================

window.deletePerson = async function(personId) {

    const person =
        people.find(
            item => item.id === personId
        );


    if (!person) {

        return;

    }


    const confirmed =
        confirm(
            `Delete "${person.name}"?\n\nThis will also delete transactions and payments linked to this person.`
        );


    if (!confirmed) {

        return;

    }


    const {
        error
    } = await supabase

        .from("persons")

        .delete()

        .eq(
            "id",
            personId
        )

        .eq(
            "user_id",
            currentUser.id
        );


    if (error) {

        console.error(error);

        alert(
            error.message
        );

        return;

    }


    await loadPeople();

};



// ============================================================
// SEARCH
// ============================================================

searchInput.addEventListener(
    "input",
    renderPeople
);



// ============================================================
// FORM BUTTONS
// ============================================================

addPersonButton.addEventListener(
    "click",
    openAddForm
);


closeFormButton.addEventListener(
    "click",
    closeForm
);


cancelButton.addEventListener(
    "click",
    closeForm
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
// MOBILE SIDEBAR
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
// HTML ESCAPE
// Prevent user-entered text from becoming HTML
// ============================================================

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

}