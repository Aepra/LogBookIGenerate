function getMonday(d) {
  d = new Date(d);
  var day = d.getDay(),
      diff = d.getDate() - day + (day == 0 ? -6: 1); // adjust when day is sunday
  return new Date(d.setDate(diff));
}

const dates = [
    "2026-06-03", // Wednesday
    "2026-06-04",
    "2026-06-07", // Sunday
    "2026-06-08", // Monday
    "2026-06-16",
];

const firstDate = new Date(dates[0]);
const startMonday = getMonday(firstDate);
startMonday.setHours(0,0,0,0);

console.log("Start Monday:", startMonday.toDateString());

dates.forEach(dStr => {
    const d = new Date(dStr);
    d.setHours(0,0,0,0);
    const diffTime = Math.abs(d - startMonday);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
    // wait, Math.floor is safer
    const diffTime2 = d.getTime() - startMonday.getTime();
    const diffDays2 = Math.floor(diffTime2 / (1000 * 60 * 60 * 24));
    const weekIndex = Math.floor(diffDays2 / 7);
    console.log(dStr, "is week", weekIndex + 1);
});
