# Rendered red evidence before implementation

- Base: merged PR464, current main e69f0499564616c33547fafd3a61f8eefc5d5c70
- Test commit: a82863ccb1f92781e59279ea37359bfe2463552a
- Command: `pnpm --filter @auto-tm/mobile test src/listings/detail/listingRelease373.spec.tsx`
- Result: exit 1, 16 behavioral failures and 5 existing behaviors passing. No setup/import/dependency failures.
- Raw output retained locally in `/tmp/autotm-373-red.log`; the concise failures follow to avoid committing React fiber dumps.

```text
 FAIL  src/listings/detail/listingRelease373.spec.tsx > issue 373 approved detail content > renders title, price, date/city, specs, description, condition, seller, report and footer in order
AssertionError: Toyota Camry XV70, 2020 follows undefined: expected -1 to be greater than -1
 FAIL  src/listings/detail/listingRelease373.spec.tsx > issue 373 approved detail content > renders the stable public number and both dates in the footer
Error: Unable to find an element with text: ID 373
 FAIL  src/listings/detail/listingRelease373.spec.tsx > issue 373 approved detail content > clamps the seller description and expands after More
AssertionError: expected undefined to be 3 // Object.is equality
 FAIL  src/listings/detail/listingRelease373.spec.tsx > issue 373 approved detail content > uses the real seller name and join month, with Private seller fallback and no phone badge
Error: Unable to find an element with text: Merdan
 FAIL  src/listings/detail/listingRelease373.spec.tsx > issue 373 approved detail content > hides unavailable VIN decoding
 FAIL  src/listings/detail/listingRelease373.spec.tsx > issue 373 approved detail content > hides unavailable VIN decoding
AssertionError: expected ReactTestInstance{ …(1) } to be null
 FAIL  src/listings/detail/listingRelease373.spec.tsx > issue 373 approved detail content > does not render the inspection demand entry
AssertionError: expected ReactTestInstance{ …(1) } to be null
 FAIL  src/listings/detail/listingRelease373.spec.tsx > issue 373 approved detail content > does not render the extra trust link
AssertionError: expected ReactTestInstance{ …(1) } to be null
 FAIL  src/listings/detail/listingRelease373.spec.tsx > issue 373 approved detail content > shows views and saves only to the owner and moves lifecycle actions out of detail content
Error: Unable to find an element with text: 19 views
 FAIL  src/listings/detail/listingRelease373.spec.tsx > issue 373 screen controls > does not open the deferred inspection prompt after publishing
AssertionError: expected ReactTestInstance{ …(1) } to be null
 FAIL  src/listings/detail/listingRelease373.spec.tsx > issue 373 screen controls > keeps Back, Share, Favorite and More options visible, then reveals the price/title after the photos scroll away
Error: Unable to find an element with role: button, name: Back
 FAIL  src/listings/detail/listingRelease373.spec.tsx > issue 373 screen controls > shares from the header and offers Report and Copy link in overflow
Error: Unable to find an element with role: button, name: More options
 FAIL  src/listings/detail/listingRelease373.spec.tsx > issue 373 screen controls > shows sticky owner Edit and Mark sold, with Archive and Delete in overflow
AssertionError: expected ReactTestInstance{ …(1) } to be null
 FAIL  src/listings/detail/listingRelease373.spec.tsx > issue 373 screen controls > gives 404 Home and Back recovery
Error: Unable to find an element with role: button, name: Go to Home
 FAIL  src/listings/detail/listingRelease373.spec.tsx > issue 373 screen controls > keeps only Call and Message in the contact bar and the SMS verification caption by Call
AssertionError: expected [ [ { …(10) }, { …(10) } ], …(3) ] to have a length of 2 but got 4
 FAIL  src/listings/detail/listingRelease373.spec.tsx > issue 373 screen controls > parks anonymous Report through requireSignIn
AssertionError: expected "spy" to be called with arguments: [ ObjectContaining{…} ]
 Test Files  1 failed (1)
      Tests  16 failed | 5 passed (21)
   Duration  7.97s (transform 373ms, setup 177ms, collect 729ms, tests 2.51s, environment 0ms, prepare 109ms)
```

The added photo-counter and clipboard tests also ran before their production changes at `b40bd45`: 22 tests, 17 behavioral failures, 5 passing. The native dark-state capture later exposed a white Message icon on its white default button; the feature composition now uses `text-background`, matching the default button foreground. This visual token correction uses ADR-0070's visual-only exemption and is verified in the final dark screenshots.
