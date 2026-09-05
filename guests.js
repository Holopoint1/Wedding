/* =========================================================
   Alfie & Lorna — SITE PASSWORD & GUEST LIST
   ---------------------------------------------------------
   This is the only file you need to edit to manage access.

   1. SITE_PASSWORD
      One password for the whole website. Share it with your
      invitations. Change it here and everyone uses the new one.

   2. GUEST_LIST
      Only people on this list can send an RSVP. On the RSVP page
      a guest chooses their name from this list, which also tells
      them whether they are invited for the whole day or the evening.

      To add a guest:     { name: "First Last", invite: "day" },
      Evening only:       { name: "First Last", invite: "evening" },
      To remove a guest:  delete their line.

   Names are matched ignoring case and extra spaces.

   Note: there are two Helen Beatties. They are told apart by the middle
   initial, exactly as on the guest-list spreadsheet: "Helen C Beattie" and
   "Helen Beattie". Keep them distinct — replies are stored under the
   normalised name, so if both were called the same thing the second to
   reply would overwrite the first. Any change here must be mirrored in
   rsvp-worker/src/worker.js, which keeps its own copy of this list.
   ========================================================= */

const SITE_PASSWORD = "Fruin2027";

const GUEST_LIST = [
  // ---------- Whole day ----------
  { name: "Lorna Beattie", invite: "day" },
  { name: "Alfie Dobson", invite: "day" },
  { name: "Helen Dobson", invite: "day" },
  { name: "John Dobson", invite: "day" },
  { name: "Harry Dobson", invite: "day" },
  { name: "Hazel Dobson", invite: "day" },
  { name: "Mim Adams", invite: "day" },
  { name: "El Carr", invite: "day" },
  { name: "Heather Walker", invite: "day" },
  { name: "Alistair Walker", invite: "day" },
  { name: "Emily Walker", invite: "day" },
  { name: "Phillip Walker", invite: "day" },
  { name: "Natalie Walker", invite: "day" },
  { name: "Tyler Lowe", invite: "day" },
  { name: "Michele Dobson", invite: "day" },
  { name: "Mark Jenkins", invite: "day" },
  { name: "Laura Jenkins", invite: "day" },
  { name: "Carolyn Dawson", invite: "day" },
  { name: "Tony Dawson", invite: "day" },
  { name: "Jonathan Dawson", invite: "day" },
  { name: "Jessica Stewart", invite: "day" },
  { name: "Lucy Dawson", invite: "day" },
  { name: "Gill Adams", invite: "day" },
  { name: "Mike Inglis", invite: "day" },
  { name: "Murray Beattie", invite: "day" },
  { name: "Anne Beattie", invite: "day" },
  { name: "Susan Slater", invite: "day" },
  { name: "May Lithgow", invite: "day" },
  { name: "Fiona Mackenzie", invite: "day" },
  { name: "Euan Mackenzie", invite: "day" },
  { name: "Cora Mackenzie", invite: "day" },
  { name: "Callan Mackenzie", invite: "day" },
  { name: "Mike Beattie", invite: "day" },
  { name: "Helen C Beattie", invite: "day" },
  { name: "Caitlyn Beattie", invite: "day" },
  { name: "Helen Beattie", invite: "day" },
  { name: "Sal Ducker", invite: "day" },
  { name: "Brian Beattie", invite: "day" },
  { name: "Heidi Grube-Hansen", invite: "day" },
  { name: "Yasemin Kolsuz", invite: "day" },
  { name: "Liam Richardson", invite: "day" },
  { name: "Molly Holmes", invite: "day" },
  { name: "Ellie Bull", invite: "day" },
  { name: "Amar Puarr", invite: "day" },
  { name: "Charlie Vidamour", invite: "day" },
  { name: "Ben Casey-Fletcher", invite: "day" },
  { name: "Jess Perry", invite: "day" },
  { name: "Elliot Cifton-Thompson", invite: "day" },
  { name: "Emily Wright", invite: "day" },
  { name: "Elliot Gee", invite: "day" },
  { name: "Maura Brown", invite: "day" },
  { name: "Mathilde Gadal", invite: "day" },
  { name: "Anna Hull", invite: "day" },
  { name: "Chris Whitehead", invite: "day" },
  { name: "Shannon Horrocks", invite: "day" },
  { name: "Steph Turner", invite: "day" },
  { name: "Ellen Shields", invite: "day" },
  { name: "Suzie Knight", invite: "day" },
  { name: "Elliot Baxendale", invite: "day" },
  { name: "Alex Green", invite: "day" },
  { name: "Emma Stepanova", invite: "day" },
  { name: "Katie Broomhead", invite: "day" },
  { name: "Jacs Payne", invite: "day" },
  { name: "Rachel Farrell", invite: "day" },

  // ---------- Evening ----------
  { name: "Catherine McKinlay", invite: "evening" },
  { name: "Alice Creasy", invite: "evening" },
  { name: "Emma Smart", invite: "evening" },
  { name: "Laura Strachan", invite: "evening" },
  { name: "Ewan Laidlaw", invite: "evening" },
  { name: "Rob Drummond", invite: "evening" },
  { name: "Grace Mackie", invite: "evening" },
  { name: "Heather Kerr", invite: "evening" },
  { name: "Hannah Bewley", invite: "evening" },
  { name: "Jen Smith", invite: "evening" },
  { name: "Kirsty Hulme", invite: "evening" },
];
