# Support entry in Favorites and Messages: three variants for the release

Prototype: `favorites-conversations.prototype.html` (issue #352). Side panel, section **Support entry**.

This is a comparison for the founder, not a recorded decision. D10 stays approved as variant A until the founder picks. Everything else in the approved prototype (D1–D9, the Favorites card, Hide sold) is unchanged.

## Why

D10 (approved 2026-10-02) put a pinned Support row in Messages and "Need help? Contact support" links in the Favorites and Messages empty and error states, plus an item in the Conversation ⋯ menu. The founder later said about the Cabinet prototype (#353): "don't overuse contact support button". The Cabinet prototype now has Help exactly once, as a menu row. This switch shows what the same restraint looks like in Favorites and Messages.

## The variants

| | A. As approved (D10) | B. Minimal (recommended, default) | C. Middle |
|---|---|---|---|
| Pinned Support row in Messages | Yes, in every state including signed out | No | No |
| "Need help?" in Favorites empty and error | Yes | No | No |
| "Need help?" in Messages empty | Yes | No | No |
| "Need help?" in Messages error | Yes | No | Yes, the only one |
| Contact support in the Conversation ⋯ menu | Yes | No | No |
| Cabinet → Help (#353) | Yes | Yes, the only entry | Yes |
| Retry and Browse buttons in empty and error states | Kept | Kept | Kept |

Support contacts are the same in all three: phone +993 63 98 94 04 and email bagtyyarkowusow.dev@gmail.com, with no hours and no response time.

In C the link opens the same email and phone screen that Cabinet → Help opens, and Back returns to the Messages error state.

## Started support thread (after the reviewer release)

The second control, **Support thread**, shows the in-app support chat from #500. That chat ships after the reviewer release, so for the release itself the control is always "None" and none of this is built.

- **A:** the pinned row becomes the #500 thread row (time, Official, preview, unread badge), as the #500 prototype shows it.
- **B and C:** nothing appears in Messages until the User has started a thread from Cabinet → Help. After that the thread is an ordinary row: AutoTM mark with the tick, the name AutoTM, a small **Support** label, the preview, and an unread badge. It is not pinned and has no tinted background. It sorts by time like any Conversation, so a new reply moves it to the top and older activity lets it sink.

Opening the row leads to a stub of the #500 thread screen (header with the Official tick, staff shown only as AutoTM, ⓘ for contacts). Sending, images and the closed and restricted states live in the #500 prototype.

## What each variant means for the release build

- **A:** build the pinned Support row (signed in, empty, signed out), four help links (Favorites empty and error, Messages empty and error), the ⋯ menu item, and the Contact support screen. Cabinet → Help from #353 is built as well, so the release has seven places that lead to the same two contacts.
- **B:** build none of the above in Favorites or Messages. The release work for support is only the Help row and screen that #353 already owns. The Favorites and Messages tickets get smaller: no Support row component, no help-link copy in three languages, no extra ⋯ menu item, no navigation from these screens to the contact screen.
- **C:** as B, plus one link on the Messages error state and the navigation from it to the Help screen.

## Recommendation: B

- It follows the founder's instruction and matches #353, where Help appears once.
- The empty states already say what to do next (Browse), and the error states offer Retry. A failed load is nearly always a connection problem; an email address does not fix it.
- A pinned row that is not a chat sits at the top of a chat list and looks like one. It takes the best position in Messages for every User on every visit.
- It is the least release work.
- It costs nothing later: when #500 ships, the thread shows up as an ordinary row once it exists.

C is reasonable if the founder wants one visible way out when Messages will not load. The link is the only difference from B.

## Things the founder should know before picking

1. **Picking B or C changes an approved decision.** D10 would need a new founder note on #352. The floating bar's D10 toggle (pinned row or header Help icon) only applies under A; the prototype says so when B or C is on.
2. **#500 shows the Support row pinned.** Its Messages list always has the Support row on top, even with no seller Conversations. B and C contradict that. If B or C is picked, the #500 prototype and its future ADR need the same change: no row until a thread exists, then an ordinary row.
3. **Where a thread starts after the release is not designed.** With B or C the only entry is Cabinet → Help, but the #353 Help screen has only Email us and Call us. After the release it will need a third row, something like "Write to support", that opens the #500 thread. Neither #353 nor #500 shows it.
4. **Two designs exist for the same contact screen.** #352 D10 uses the #500 ⓘ contact-sheet design (AutoTM mark, Official tick, two contact cards). #353 uses a plain list titled Help (Email us, Call us, one line on what to include). With B or C only one screen is built; the #353 one is the natural owner. This prototype keeps the D10 layout and only changes the title to Help when it is opened from Cabinet.
5. **Signed out.** A keeps the Support row on the signed-out Messages screen. B and C show only Sign in there; a signed-out User reaches support through Cabinet → Help, which #353 shows signed out too. #500's approved D7 (signed out shows Sign in plus email and phone on Messages) is post-release and would also need revisiting under B or C.
6. **Row name.** In B and C the started thread is named "AutoTM" with a "Support" label, following #500's decision to show staff only as AutoTM. #500's own row is titled "AutoTM Support" with an "Official" badge. The wording is a draft.

## Added only so the variants can be shown

- A Cabinet stub (four plain rows, Help is the live one) on the Cabinet tab, which used to show an "out of scope" message. The real Cabinet is the #353 prototype.
- The support thread stub described above.
- URL parameters `se=A|B|C` and `sup=started|reply` next to the existing `lang`, `dark` and `surface`.
- New RU, EN and TK strings for the stubs and the Support label. The TK text is a draft.
