// =====================================================================
//  YOUR SCHEDULE — this is the only file you need to change to edit it.
//  After editing, upload this file to GitHub (see README.md) and the
//  app on your phone picks up the change the next time it opens.
// =====================================================================
//
// How the day is built:
//  - Every time is in minutes after you wake up (wake time is set in the app).
//    0 = wake up, 60 = one hour after waking, 540 = nine hours after waking.
//  - task(...) adds a block you tap to check off. After it, a TRANSITION break
//    (10 min) is left before the next thing, unless a different pause is given.
//  - free(...) adds a block that isn't checked off (walks, free time, wind down).
//  - gap(until, name) fills any slack up to `until` with an open block.
//  - The app shows each block's length next to its name, so names don't need it.
//
// Days of the week are numbered: 0 Mon, 1 Tue, 2 Wed, 3 Thu, 4 Fri, 5 Sat, 6 Sun.

window.SCHEDULE = (function () {
  "use strict";

  const DEFAULT_WAKE = 11 * 60;      // 11:00 AM
  const STREAM_DAYS = [1, 3, 5];     // Tue, Thu, Sat
  const TRANSITION = 10;             // minutes of breathing room after each task
  const SPAN = 900;                  // wake → lights out (15 hours); width of the timeline bars

  // Colors live in styles.css (--c-body, --c-fuel, ...).
  const CATEGORIES = {
    body:   { label: "Body",     color: "var(--c-body)" },
    fuel:   { label: "Fuel",     color: "var(--c-fuel)" },
    work:   { label: "Job hunt", color: "var(--c-work)" },
    create: { label: "Content",  color: "var(--c-create)" },
    live:   { label: "Live",     color: "var(--c-live)" },
    reset:  { label: "Reset",    color: "var(--c-reset)" },
    free:   { label: "Free",     color: "var(--c-free)" }
  };

  // Rows on the week board. Each row collects the blocks whose `kind` matches.
  const BOARD_ROWS = [
    { kind: "workout", label: "Workout" },
    { kind: "recovery", label: "Shake + shower" },
    { kind: "meals", label: "Meals" },
    { kind: "jobs", label: "Job search" },
    { kind: "edit", label: "Content creation" },
    { kind: "prep", label: "Food prep" },
    { kind: "stream", label: "Stream" },
    { kind: "routine", label: "Gym trip + set up" },
    { kind: "sleep", label: "Lights out" },
    { kind: "review", label: "Review" }
  ];

  // "Hours per week" panel: which kinds to total, and what to call them.
  const HOURS = { workout: "Workout", meals: "Meals (3 a day)", jobs: "Job search", edit: "Content creation", prep: "Food prep", stream: "Streaming" };

  // Builds one day. Showing up for the full block is what counts, not how much gets finished.
  function planFor(dow) {
    const p = [];
    let t = 0;
    const task = (id, kind, dur, name, cat, pause = TRANSITION) => {
      p.push({ id, kind, off: t, dur, name, cat, check: true });
      t += dur + pause;
    };
    const free = (id, dur, name) => { p.push({ id, kind: "free", off: t, dur, name, cat: "free", check: false }); t += dur; };
    const meal = (n, pause) => task("meal" + n, "meals", 30, "Meal " + n, "fuel", pause);
    // Fill up to `until` with open time when there's real slack; a short leftover stays as breathing room.
    const gap = (until, name) => {
      if (until - t >= 30) p.push({ id: "open" + t, kind: "free", off: t, dur: until - t, name, cat: "free", check: false });
      t = Math.max(t, until);
    };
    const live = STREAM_DAYS.includes(dow);

    task("launch", "routine", 30, "Wake up + head to gym", "reset", 0);
    if (dow === 6) task("workout", "workout", 90, "Recovery walk or yoga", "body");
    else task("workout", "workout", 90, "Gym workout", "body");
    task("shower", "recovery", 45, "Protein shake + shower", "body");
    // Food prep days (Wed, Sun) cook before meal 1, so meal 1 comes out of the fresh batch.
    if (dow === 2 || dow === 6) task("prep", "prep", 90, "Food prep", "fuel", 5);
    meal(1);

    // Every editing block (videos, clips, thumbnails) goes by the one name "Content creation".
    if (dow <= 4) {
      task("jobs", "jobs", 90, "Job search + apply", "work", 0);
      free("walk", 20, "Reset walk, no phone"); t += 5;
      task("edit1", "edit", 120, "Content creation", "create");
    } else if (dow === 5) {
      task("edit1", "edit", 180, "Content creation", "create");
    } else {
      task("review", "review", 30, "Weekly review", "reset");
    }

    // Meal 2 by 6:50 PM (wake + 7h50) so stream setup still gets 30 min; meal 3 right after the stream.
    // Days without a stream keep the same meal times.
    gap(470, dow === 5 ? "Rest before stream" : "Open time");
    meal(2);
    if (live) {
      task("setup", "stream", 540 - t, "Stream setup", "live", 0);
      task("stream", "stream", 270, "Live stream", "live", 5);
    } else {
      if (dow === 0 || dow === 4) task("edit2", "edit", 90, "Content creation", "create");
      free("evening", 815 - t, "Free time");
    }
    meal(3, 5);
    task("shutdown", "routine", 15, dow === 6 ? "Set up for Monday" : "Set up for tomorrow", "reset", 0);
    free("bedtime", 900 - t, "Wind down, phone away");
    task("sleep", "sleep", 540, "Lights out + sleep", "reset");
    return p;
  }

  return { DEFAULT_WAKE, STREAM_DAYS, SPAN, CATEGORIES, BOARD_ROWS, HOURS, planFor };
})();
