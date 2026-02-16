# BeGifted App Update — Release Notes (Build 7)

**For:** Stakeholders
**Date:** February 2025  
**Applies to:** BeGifted mobile app (iOS & Android)  
**Build:** 7 (changes since Build 6)

---

This document describes what’s new in this release compared to the previous TestFlight build.

---

## 1. New Navigation: Bottom Bar Instead of Hamburger Menu

**Before:** You opened a hamburger menu (☰) to move between sections.  
**After:** A bottom bar is always visible with four tabs: **Home**, **Contacts**, **Calendar**, and **Settings**.

- One tap to switch between sections.
- The bottom bar stays visible as you scroll.
- Navigation is easier to discover and use.
- Screens stay loaded when you switch, so data doesn’t reload every time.

---

## 2. Editing People: Full Screen Instead of Pop-up

**Before:** Editing a person’s details (occasions, likes, etc.) happened in a pop-up overlay.  
**After:** Editing uses a full screen with two tabs: **Details** and **Gifts**.

- More space to view and edit information.
- Easier to switch between details and gift suggestions.
- More comfortable on smaller phones.

---

## 3. Smarter Occasion Suggestions When Adding People

**Before:** Occasions were mainly taken from your conversation.  
**After:** The app suggests occasions based on the person’s interests (e.g. running → National Running Day, music → Record Store Day).

- Suggestions are based on real holidays and observances.
- Birthday and common holidays are still included.
- You can add or remove suggested occasions before saving.

---

## 4. Clearer Contacts Permission Flow

**Before:** The app asked for contacts permission with little context.  
**After:** A short intro screen explains why the app needs access and what “add all” means.

- You understand that “all” applies only to the contacts shown in the list, not the whole address book.
- You can go to device Settings to change the permission.
- The contact picker shows email, phone, and birthday when available.

---

## 5. Gifting Preferences: Easier to Use and More Reliable

**Before:** You had to scroll to the bottom to save; the screen could get stuck on “Loading…”; errors often didn’t show a message.  
**After:**

- **Floating Save button:** When you change something, a Save button appears at the bottom and stays visible while you scroll. No need to scroll back down to save.
- **Save only when needed:** The Save button only appears when you’ve made changes.
- **More reliable loading:** The screen loads more reliably; if there’s a brief connectivity issue, it falls back to defaults instead of staying stuck.
- **Clearer errors:** If save fails (e.g. poor connection), you see a clear message instead of a silent failure.

---

## 6. Profile Settings: Simpler and More Focused

**Before:** Profile could include multiple fields.  
**After:** Profile focuses on your name only, stored in the main profiles system.

- Cleaner form.
- Fewer fields to manage.
- Better handling of network errors when saving.
- Settings cards are more responsive and easier to tap.

---

## 7. Faster Data Loading and Caching

**Before:** Data was reloaded when you switched screens or reopened the app.  
**After:** The app caches data more aggressively so it:

- Loads faster when you switch between Home, Contacts, Calendar, and Settings.
- Keeps FAQ answers cached so they appear quickly.
- Shows the correct number of people on the dashboard more reliably.
- Cached data survives app restarts.

---

## 8. Occasion Dates and Logic

**Before:** Occasion dates could be wrong when events had already passed.  
**After:** The app correctly picks the next occurrence of a date (e.g. next birthday, next Christmas).

- Past dates are moved to the next year.
- Fixed holidays and variable holidays (e.g. Easter, Thanksgiving) are handled correctly.

---

## 9. Add Recipient Flow: Easier to Use

**Before:** Extra space above headers; message input and action buttons could be hidden behind the bottom bar; autofill suggestions appeared when typing; send button was hard to see.  
**After:**

- **Tighter layout:** Less empty space between the app header and screen titles (Add Recipient, Select Occasions, Review Recipient Data).
- **Visible input and buttons:** The message input and all action buttons (Continue, Back, Skip) stay visible above the bottom navigation bar.
- **No autofill on chat:** The conversation input no longer shows autofill suggestions, so you can type freely.
- **Clearer send button:** The send button is easier to see and tap.

---

## 10. Other Improvements

- **Device contacts:** Smoother flow when adding people from your phone’s contacts.
- **FAQ:** Easier to read and navigate.
- **Headers:** Standardized across screens with less overlap and clearer layout.
- **Automatic gift suggestions:** Removed to give you more control over when suggestions appear.

---

## Summary

This release (Build 7) adds:

- **Easier navigation** via a bottom bar
- **Full-screen editing** for contacts
- **Smarter occasion suggestions** based on interests
- **Clearer contacts permission** flow
- **More reliable** Gifting Preferences with floating save
- **Simpler profile** settings
- **Faster, more consistent** data loading
- **Correct occasion dates** for past and future events
- **Improved Add Recipient flow** with visible input/buttons and no autofill

If you have questions or feedback, please reach out to the product team.
