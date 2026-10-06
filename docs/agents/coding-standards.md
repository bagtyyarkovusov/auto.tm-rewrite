# Coding standards: modules and tests

These rules cover how code is shaped into modules and how it is tested. Layering, ports, migrations and secrets stay in [AGENTS.md](../../AGENTS.md) and [domain guidance](domain.md); styling and data fetching stay in their own guides.

## How this file is applied

Read this section first. It limits what an implementer or reviewer may do with the rules below.

1. **New lines only.** The rules apply to code and tests a pull request adds. Existing code and existing tests are out of scope, including the rest of a file the pull request touches. A reviewer does not ask for them to be rewritten.
2. **Advisory until the first store release.** A finding under this file is non-blocking and goes to the area's follow-up batch ([Small changes](coding-workflow.md#small-changes-adr-0065)). One case blocks, as it already does under the [Spec evidence checklist](../../.claude/skills/run-issue/FINALIZATION.md#spec-evidence-checklist): a new test that cannot fail when the behaviour it names breaks.
3. **No refactor requests in a feature pull request.** A reviewer does not ask for a module to be restructured, a screen to be split, or shared test helpers to be introduced. Those are separate issues the founder selects.
4. **Follow the file you are in.** When a spec already stubs a hook or a component, a new test in that spec may do the same. Do not convert half a file.
5. **Review after the release.** The founder then decides whether findings become blocking and which cleanup issues to file.

## Vocabulary

- **Module:** anything with an interface and an implementation: a function, a class, a hook, a screen, a package.
- **Interface:** everything a caller must know to use the module: types, invariants, error modes, ordering, configuration.
- **Deep module:** a lot of behaviour behind a small interface. **Shallow:** an interface nearly as complicated as what it hides.
- **Seam:** the place where a module's interface lives and where behaviour can be swapped without editing the caller.
- **Adapter:** a concrete thing that fills a seam, such as a Prisma repository or an in-memory fake.

## Modules

1. **Hide complexity behind a small interface.** Before adding a function, hook or file, ask what the caller no longer has to know because it exists. If the answer is nothing, write the code where it is used.
2. **Apply the deletion test.** Imagine deleting the module. If the complexity reappears in several callers, it earns its place. If it only moves, it is a pass-through.
3. **Do not extract code only to test it.** A pure helper pulled out of a screen so it can be unit-tested leaves the real risk, how the screen calls it, untested. Test through the module that owns the behaviour.
4. **Add a seam only where something varies.** A port needs two adapters, usually production and a test fake. One adapter is indirection.
5. **Accept dependencies; do not create them.** Time, randomness, storage, network and native modules come in through a parameter, a port or a provider.
6. **Return results where you can.** A function that returns a value is easier to use and to test than one that changes state somewhere else.
7. **Keep screens thin.** An Expo Router screen wires navigation, data and layout. Decisions, such as which step comes next, what a refusal means, or whether a selection is valid, live in a module the screen calls. The Sell wizard reducer is the model.

## Tests

1. **The interface is the test surface.** A test uses the module the way its callers do and asserts on what they can observe: a returned value, rendered text, an enabled or disabled control, a navigation, a stored record read back through the interface.
2. **Mock at system boundaries only.** These are the network, the database, storage, time, randomness and native modules. Do not mock this repository's own components, hooks or modules.
3. **Mobile network behaviour goes through the fake server (MSW)** with the real API hooks, not through a stubbed hook or a stubbed API client.
4. **Do not replace a child component with `null` in a new test.** If a screen cannot be rendered with its real children, say so in the pull request; that is a finding about the screen, recorded for the follow-up batch.
5. **Assert outcomes, not calls.** Do not assert how many times, or in what order, an internal collaborator was called. Asserting a call is correct when the call is the outcome: a callback prop, a navigation, or a message sent through a port's fake.
6. **Use literal expected values.** An expected value computed the way the code computes it passes by construction.
7. **One fake per port, next to the port.** A new fake goes in the module's `application/testing/` folder and is imported by its specs. Do not add another copy of an existing fake to a spec file.
8. **Name the behaviour.** A test title says what the seller, buyer or caller gets, not which function runs.
9. **Replace, do not layer.** When a module is deepened and tested at its new interface, delete the old tests of the pieces it absorbed.

## Signs a new test needs another look

- It still passes with the production code it covers deleted or stubbed.
- It breaks when code is rearranged with no change in behaviour.
- Its setup is longer than its assertions and most of it is mocks of this repository's code.
- It checks state through a back door, such as a direct database query, when the interface could show it.

## Where this comes from

The vocabulary and tests follow John Ousterhout's deep modules, Michael Feathers's seams, and the `codebase-design`, `improve-codebase-architecture` and `tdd` skills. Test-first evidence is governed by [VERIFICATION.md](../../.claude/skills/run-issue/VERIFICATION.md); mobile test mechanics by [Mobile component tests](mobile-testing.md).
