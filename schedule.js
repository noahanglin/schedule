// =====================================================================
//  YOUR SCHEDULE — this is the only file you need to change to edit it.
//  After editing, upload this file to GitHub (see README.md) and the
//  app on your phone picks up the change the next time it opens.
// =====================================================================
//
// How the day is built:
//  - Every time is in minutes after you wake up (wake time is set in the app).
//    0 = wake up, 60 = one hour after waking, 540 = nine hours after waking.
//  - task(...) adds a block with a checkbox. After it, a TRANSITION break
//    (10 min) is left before the next thing, unless a different pause is given.
//  - free(...) adds a block without a checkbox (open time, walks, wind down).
//  - gap(until, note) fills any slack up to `until` with "Open time".
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
    create: { label: "Create",   color: "var(--c-create)" },
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
    { kind: "edit", label: "Editing" },
    { kind: "prep", label: "Food prep" },
    { kind: "stream", label: "Stream" },
    { kind: "routine", label: "Gym trip + shutdown" },
    { kind: "sleep", label: "Lights out" },
    { kind: "review", label: "Review" }
  ];

  // "Hours per week" panel: which kinds to total, and what to call them.
  const HOURS = { workout: "Workout", meals: "Meals (3 a day)", jobs: "Job search", edit: "Video editing", prep: "Food prep", stream: "Streaming" };

  // Builds one day. `clock(minutesAfterWake)` turns an offset into a time like "11:30 AM".
  // Goals are time commitments: showing up for the block is what counts, not how much gets finished.
  function planFor(dow, clock) {
    const p = [];
    let t = 0;
    const task = (id, kind, dur, name, cat, goal, pause = TRANSITION) => {
      p.push({ id, kind, off: t, dur, name, cat, goal, check: true });
      t += dur + pause;
    };
    const free = (id, dur, name, sub) => { p.push({ id, kind: "free", off: t, dur, name, cat: "free", sub, check: false }); t += dur; };
    const meal = (n, pause) => task("meal" + n, "meals", 30, "Meal " + n, "fuel", "30 min to make and eat", pause);
    // Fill up to `until` with open time when there's real slack; a short leftover stays as breathing room.
    const gap = (until, sub) => {
      if (until - t >= 30) p.push({ id: "open" + t, kind: "free", off: t, dur: until - t, name: "Open time", cat: "free", sub, check: false });
      t = Math.max(t, until);
    };
    const live = STREAM_DAYS.includes(dow);

    task("launch", "routine", 30, "Up + get to the gym", "reset", "Out the door, at the gym by " + clock(30), 0);
    if (dow === 6) task("workout", "workout", 90, "Recovery workout", "body", "90 min moving: hike, long walk or yoga");
    else task("workout", "workout", 90, "Workout", "body", "Train the full 90 minutes");
    task("shower", "recovery", 45, "Protein shake + shower", "body", "45 min to refuel and get ready");
    // Food prep days (Wed, Sun) cook before meal 1, so meal 1 comes out of the fresh batch.
    if (dow === 2 || dow === 6) task("prep", "prep", 90, "Food prep", "fuel", "90 min in the kitchen", 5);
    meal(1);

    if (dow <= 4) {
      task("jobs", "jobs", 90, "Job search", "work", "90 min searching and applying", 0);
      free("walk", 20, "Reset walk", "Step outside, no phone scrolling"); t += 5;
      task("edit1", "edit", 120, "Video editing", "create", "2 hours on the timeline");
    } else if (dow === 5) {
      task("edit1", "edit", 180, "Long editing session", "create", "3 hours on the timeline");
    } else {
      task("review", "review", 30, "Weekly review", "reset", "30 min with the week board");
    }

    // Meal 2 by 6:50 PM (wake + 7h50) so stream setup still gets 30 min; meal 3 right after the stream.
    // Days without a stream keep the same meal times.
    gap(470, dow === 5 ? "Rest up before tonight's stream" : dow === 6 ? "Rest, friends, whatever you like" : "Errands, chores, rest, or catch-up if something ran over");
    meal(2);
    if (live) {
      task("setup", "stream", 540 - t, "Stream setup", "live", (540 - t) + " min: go-live post, scenes, title", 0);
      task("stream", "stream", 270, "Stream", "live", "Live for 4 to 5 hours", 5);
    } else {
      if (dow === 0 || dow === 4) task("edit2", "edit", 90, "Clips + thumbnails", "create", "90 min on clips and thumbnails");
      free("evening", 815 - t, "Free time", "Games, friends, shows. You earned it.");
    }
    meal(3, 5);
    task("shutdown", "routine", 15, "Shutdown", "reset", "15 min: gym clothes out, look over " + (dow === 6 ? "Monday" : "tomorrow"), 0);
    free("bedtime", 900 - t, "Wind down", "Lights low, phone charging across the room");
    task("sleep", "sleep", 540, "Sleep · 9 hours", "reset", "Lights out by " + clock(900) + " for the full 9 hours");
    return p;
  }

  return { DEFAULT_WAKE, STREAM_DAYS, SPAN, CATEGORIES, BOARD_ROWS, HOURS, planFor };
})();
