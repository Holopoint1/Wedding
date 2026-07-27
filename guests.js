/* =========================================================
   Alfie & Lorna — GUEST LIST & PERSONAL LOGINS
   ---------------------------------------------------------
   This is the only file you need to edit to manage guests.

   Each guest logs in with their NAME + their PASSWORD
   (also saved in the "Website Password" column of your
   Guest List spreadsheet — share it with their invitation).

   To add a guest:
     { name: "First Last", invite: "day", password: "word12" },
   Use invite: "evening" for evening-only guests.
   To remove a guest, delete their line — they can no longer
   log in or RSVP.

   Names are matched ignoring case and extra spaces.
   Note: there are two Helen Beatties — their different
   passwords tell them apart when they log in.
   ========================================================= */

const GUEST_LIST = [
  // ---------- Whole day ----------
  { name: "Lorna Beattie", invite: "day", password: "thistle56" },
  { name: "Alfie Dobson", invite: "day", password: "scone27" },
  { name: "Helen Dobson", invite: "day", password: "dale25" },
  { name: "John Dobson", invite: "day", password: "holly62" },
  { name: "Harry Dobson", invite: "day", password: "crag33" },
  { name: "Hazel Dobson", invite: "day", password: "skye23" },
  { name: "Mim Adams", invite: "day", password: "willow65" },
  { name: "El Carr", invite: "day", password: "frost32" },
  { name: "Heather Walker", invite: "day", password: "oak40" },
  { name: "Alistair Walker", invite: "day", password: "dew26" },
  { name: "Emily", invite: "day", password: "peat35" },
  { name: "Phillip Walker", invite: "day", password: "staffa65" },
  { name: "Natalie Walker", invite: "day", password: "lark79" },
  { name: "Tyler", invite: "day", password: "esk91" },
  { name: "Michele Dobson", invite: "day", password: "fox63" },
  { name: "Mark Jenkins", invite: "day", password: "bramble60" },
  { name: "Laura Jenkins", invite: "day", password: "hazel25" },
  { name: "Carolyn Dawson", invite: "day", password: "loch27" },
  { name: "Tony Dawson", invite: "day", password: "brae46" },
  { name: "Jonathan Dawson", invite: "day", password: "heather17" },
  { name: "Jess", invite: "day", password: "ivy59" },
  { name: "Lucy Dawson", invite: "day", password: "wren91" },
  { name: "Gill Adams", invite: "day", password: "kelpie17" },
  { name: "Mike Inglis", invite: "day", password: "rowan17" },
  { name: "Murray Beattie", invite: "day", password: "banno25" },
  { name: "Anne Beattie", invite: "day", password: "robin43" },
  { name: "Susan Slater", invite: "day", password: "daisy68" },
  { name: "May Lithgow", invite: "day", password: "vale52" },
  { name: "Fiona Mackenzie", invite: "day", password: "swan13" },
  { name: "Euan Mackenzie", invite: "day", password: "firth71" },
  { name: "Cora Mackenzie", invite: "day", password: "kilt81" },
  { name: "Callan Mackenzie", invite: "day", password: "maple59" },
  { name: "Mike Beattie", invite: "day", password: "stag90" },
  { name: "Helen Beattie", invite: "day", password: "moss51" },
  { name: "Caitlin Beattie", invite: "day", password: "ayr18" },
  { name: "Helen Beattie", invite: "day", password: "rose82" },
  { name: "Sal Ducker", invite: "day", password: "misty81" },
  { name: "Brian Beattie", invite: "day", password: "fern63" },
  { name: "Heidi Beattie", invite: "day", password: "oban92" },
  { name: "Yasemin Kolsuz", invite: "day", password: "reed67" },
  { name: "Liam Richardson", invite: "day", password: "poppy11" },
  { name: "Molly Holmes", invite: "day", password: "alder80" },
  { name: "Ellie Bull", invite: "day", password: "brook59" },
  { name: "Amar Puarr", invite: "day", password: "pine15" },
  { name: "Charlie Vidamour", invite: "day", password: "fawn18" },
  { name: "Ben Casey-Fletcher", invite: "day", password: "selkie11" },
  { name: "Jess Perry", invite: "day", password: "leaf12" },
  { name: "Elliot Cifton-Thompson", invite: "day", password: "pebble14" },
  { name: "Emily Wright", invite: "day", password: "bute51" },
  { name: "Elliot Gee", invite: "day", password: "burn26" },
  { name: "Maura Brown", invite: "day", password: "plaid98" },
  { name: "Mathilde Gadal", invite: "day", password: "clover50" },
  { name: "Anna Hull", invite: "day", password: "finch34" },
  { name: "Chris Whitehead", invite: "day", password: "isle24" },
  { name: "Shannon Horrocks", invite: "day", password: "tartan70" },
  { name: "Steph Turner", invite: "day", password: "arran92" },
  { name: "Ellen Shields", invite: "day", password: "moor77" },
  { name: "Suzie Knight", invite: "day", password: "birch56" },
  { name: "Elliot Baxendale", invite: "day", password: "jura36" },
  { name: "Alex Green", invite: "day", password: "hare32" },
  { name: "Emma Stepanova", invite: "day", password: "tay86" },

  // ---------- Evening ----------
  { name: "Catherine McKinlay", invite: "evening", password: "iona45" },
  { name: "Alice Creasy", invite: "evening", password: "slate81" },
  { name: "Emma Smart", invite: "evening", password: "islay20" },
  { name: "Laura Strachan", invite: "evening", password: "nevis30" },
  { name: "Ewan Laidlaw", invite: "evening", password: "doe97" },
  { name: "Rob Drummond", invite: "evening", password: "glen89" },
  { name: "Grace Mackie", invite: "evening", password: "otter12" },
  { name: "Heather Kerr", invite: "evening", password: "tide63" },
  { name: "Hannah Bewley", invite: "evening", password: "luss55" },
  { name: "Jen Smith", invite: "evening", password: "bud93" },
  { name: "Kirsty Hulme", invite: "evening", password: "dee53" },
];
