import { supabase } from "./supabase.js";

console.log("SmartKhata started!");
console.log("Supabase client:", supabase);

document.getElementById("app").innerHTML = `
    <h1>SmartKhata</h1>
    <p>Digital Credit & Payment Management System</p>
    <p>Supabase connected successfully.</p>
`;