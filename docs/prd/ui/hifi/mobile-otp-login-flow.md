# High-fidelity Design - Mobile OTP Login Flow

Issue: GitHub #40, S2 mobile OTP flow

Platform decision: mobile only. This is a transaction/auth flow, so public web is out of scope for issue #40. Public web legal pages are linked from the mobile flow.

Structural baseline: `docs/prd/ui/wireframes/mobile-otp-login-flow.md`

References:
- `docs/prd/features/30-identity.md`
- `docs/prd/flows/60-first-time-user.md`
- `docs/prd/sprints/sprint-02-identity.md`
- `docs/prd/features/36-notifications.md`
- `docs/prd/ops/83-legal.md`
- `apps/mobile/CONTEXT.md`
- `packages/ui/tokens/*.ts`
- `packages/ui/theme/theme.css`
- `apps/mobile/assets/logos_color_red.svg`

==============================================
HIGH-FIDELITY DESIGN - Mobile OTP Login Flow
Platform: mobile
Mode: light + dark
==============================================

## Purpose

Authenticate a buyer or seller only after a gated action, using a fast Turkmenistan phone OTP flow that supports SMS autofill, paste, inline errors, legal links, and deferred-action replay.

## Layout

```text
Action-gated bottom sheet
┌────────────────────────────────────────────┐
│ Current screen with scrim                  │
│                                            │
│                 ┌──────────────────────┐   │
│                 │ Sign in to <action>  │   │
│                 │ Continue with phone  │   │
│                 │ [Continue with phone]│   │
│                 └──────────────────────┘   │
└────────────────────────────────────────────┘

Phone route: (auth)/phone
┌────────────────────────────────────────────┐
│ [X]                                RU TK EN│
│             auto.tm logo                   │
│ Enter your phone number                    │
│ We'll send a code by SMS.                  │
│ Phone number                               │
│ [+993][6X XX-XX-XX]                        │
│ [Get code]                                 │
│ By continuing, Terms + Privacy links       │
└────────────────────────────────────────────┘

OTP route: (auth)/otp
┌────────────────────────────────────────────┐
│ [<] [X]                            RU TK EN│
│             auto.tm logo                   │
│ Enter the code                             │
│ Code sent to +993 6X XX-XX-42              │
│ [Change number]                            │
│ [ ][ ][ ][ ][ ][ ]                         │
│ Resend code in 42s                         │
└────────────────────────────────────────────┘
```

## Token map

### Backgrounds + surfaces

- Root background: `bg-[var(--background)]`, light resolves to background token, dark resolves to background token.
- Bottom sheet surface: `bg-[var(--surface-elevated)]`, light/dark via semantic token.
- Input surface: `bg-[var(--surface-elevated)]`, light/dark via semantic token.
- OTP cell surface: default `bg-[var(--surface)]`; focused cell `bg-[var(--surface-elevated)]`.
- Error banner/tint: `bg-[var(--color-error-500)]/10`, same token in both modes.
- Warning/offline tint: `bg-[var(--color-warning-500)]/10`, same token in both modes.

### Borders + dividers

- Sheet top divider: `border-t border-[var(--border)]`, light/dark via semantic token.
- Input border: default `border border-[var(--border)]`; focused `border-2 border-[var(--color-brand-500)]`; error `border-2 border-[var(--color-error-500)]`.
- OTP cell border: default `border border-[var(--border)]`; filled `border-[var(--color-brand-500)]`; error `border-[var(--color-error-500)]`.

### Typography

- Screen title: Inter `2xl/snug/semibold`, `text-[var(--text-primary)]`.
- Body/helper: Inter `base/normal/regular`, `text-[var(--text-secondary)]`.
- Form label: Inter `sm/snug/medium`, `text-[var(--text-primary)]`.
- Input text: Inter `base/normal/regular`, `text-[var(--text-primary)]`.
- OTP digit: Menlo `2xl/tight/semibold`, `text-[var(--text-primary)]`.
- Error text: Inter `sm/snug/regular`, `text-[var(--color-error-500)]`.
- Legal text: Inter `xs/normal/regular`, `text-[var(--text-tertiary)]`.
- Legal links: Inter `xs/normal/medium`, `text-[var(--color-info-500)]`, underline only for links.
- Button label: Inter `base/tight/medium`, primary `text-[var(--text-on-primary)]`.
- Language switcher: Inter `sm/tight/medium`, active `text-[var(--text-primary)]`, inactive `text-[var(--text-tertiary)]`.

### Spacing

- Screen horizontal padding: `px-4`.
- Header vertical padding: `py-4`.
- Logo to title gap: `mt-8`.
- Title group gap: `gap-2`.
- Form section gap: `gap-4`.
- Screen content gap: `gap-8`.
- Bottom legal spacing: `mt-auto pb-6`.
- Sheet padding: `p-4`.
- OTP row gap: `gap-2`.

### Radius

- Bottom sheet: `rounded-t-2xl`.
- Inputs: `rounded-md`.
- Buttons: `rounded-md`.
- OTP cells: `rounded-md`.
- Dev-only code pill: `rounded-md`.

### Shadows

- Bottom sheet: `shadow-lg`.
- Auth routes: no shadow, full-screen modal.
- Focus states: border change only, no extra shadow.

### Icons

- Close button: Lucide `X`, size token equivalent to dense icon, stroke default.
- Back button: Lucide `ChevronLeft`, size token equivalent to dense icon, stroke default.
- Inline error icon: Lucide `AlertCircle`, inline size.
- Offline warning icon: Lucide `WifiOff`, inline size.
- Button icon: none in S2.

## Component shape

### Implementation - mobile, NativeWind v4

```tsx
<View className="flex-1 bg-[var(--background)]">
  <SafeAreaView className="flex-1 px-4">
    <View className="flex-row items-center justify-between py-4">
      <Pressable accessibilityRole="button" accessibilityLabel={t("auth.close")}>
        <X className="text-[var(--text-primary)]" />
      </Pressable>
      <LocaleSwitcher compact />
    </View>

    <View className="mt-8 gap-8">
      <Logo
        asset={require("../../assets/logos_color_red.svg")}
        fallbackText="AutoTM"
        className="h-10 self-start"
      />

      <View className="gap-2">
        <Text className="text-2xl font-semibold leading-snug text-[var(--text-primary)]">
          {t("auth.phone.title")}
        </Text>
        <Text className="text-base leading-normal text-[var(--text-secondary)]">
          {t("auth.phone.helper")}
        </Text>
      </View>

      <PhoneInput
        prefix="+993"
        value={phoneDisplay}
        onChangeText={setPhoneDisplay}
        error={phoneError}
      />

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: !canRequestCode || isSubmitting }}
        className="h-12 items-center justify-center rounded-md bg-[var(--color-brand-500)] disabled:opacity-50"
        onPress={requestCode}
      >
        <Text className="text-base font-medium leading-tight text-[var(--text-on-primary)]">
          {t("auth.phone.getCode")}
        </Text>
      </Pressable>
    </View>

    <Text className="mt-auto pb-6 text-xs leading-normal text-[var(--text-tertiary)]">
      {t("auth.legal.prefix")} <LegalLink type="terms" /> {t("auth.legal.and")} <LegalLink type="privacy" />.
    </Text>
  </SafeAreaView>
</View>
```

```tsx
<View className="flex-1 bg-[var(--background)]">
  <SafeAreaView className="flex-1 px-4">
    <View className="flex-row items-center justify-between py-4">
      <View className="flex-row gap-2">
        <Pressable accessibilityRole="button" accessibilityLabel={t("auth.backToPhone")}>
          <ChevronLeft className="text-[var(--text-primary)]" />
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={t("auth.close")}>
          <X className="text-[var(--text-primary)]" />
        </Pressable>
      </View>
      <LocaleSwitcher compact />
    </View>

    <View className="mt-8 gap-8">
      <Logo asset={require("../../assets/logos_color_red.svg")} fallbackText="AutoTM" className="h-10 self-start" />

      <View className="gap-2">
        <Text className="text-2xl font-semibold leading-snug text-[var(--text-primary)]">
          {t("auth.otp.title")}
        </Text>
        <Text className="text-base leading-normal text-[var(--text-secondary)]">
          {t("auth.otp.sent", { phone: maskedPhone })}
        </Text>
        <Pressable accessibilityRole="button" onPress={changeNumber}>
          <Text className="text-sm font-medium text-[var(--color-info-500)]">
            {t("auth.otp.changeNumber")}
          </Text>
        </Pressable>
      </View>

      <OtpInput
        length={6}
        value={code}
        onChange={setCode}
        onComplete={verifyCode}
        textContentType="oneTimeCode"
        autoComplete="sms-otp"
        error={otpError}
      />

      <ResendCode secondsRemaining={resendSeconds} onResend={resendCode} />
      {isDev && testCode ? <DevCode code={testCode} /> : null}
    </View>
  </SafeAreaView>
</View>
```

Notes:
- If direct SVG imports are not configured in Expo, wrap the SVG with `react-native-svg` in a `Logo` component or add the transformer intentionally. The visible fallback is the text `AutoTM`.
- The OTP UI uses one actual numeric `TextInput` behind six visual cells. The hidden input owns focus, paste, SMS autofill, and accessibility.

## States

### Default

The user sees a full-screen modal route with the red SVG logo, a direct title, one input, one primary CTA, and minimal helper/legal copy. Auth does not ask for notifications and does not block browsing outside gated actions.

### Loading

- Phone request: primary CTA enters submitting state and ignores duplicate taps; phone input stays readable.
- OTP verify: cells stay visible, duplicate verify submissions are blocked.
- Skeleton: N/A. This is an input flow, not a data-fetching screen.
- First paint target: mobile first paint target from design principles.

### Empty

- Phone: field focused, prefix locked, CTA disabled until local phone format is complete.
- OTP: first cell focused, masked destination copy visible, resend countdown visible.
- Empty illustration: N/A.

### Error

- Pattern: inline error below the affected input. No error route.
- Color: `bg-[var(--color-error-500)]/10 text-[var(--color-error-500)]` for banners, `text-[var(--color-error-500)]` for input helper.
- Icon: Lucide `AlertCircle` for banner-level errors only.
- Wrong OTP: cells shake, clear all digits, refocus first cell.
- Expired OTP: show expired copy, keep Change number, enable resend when backend allows.
- Rate-limited phone request: keep phone entry in place, disable CTA, show countdown.
- Retry behavior: retry in place after countdown or when network returns.

### Offline

- Banner: `bg-[var(--color-warning-500)]/10 text-[var(--color-warning-500)]`.
- Copy acknowledges that SMS request or verification needs connectivity.
- Existing typed phone is preserved in memory; OTP code is not persisted.

### Success

- Deferred action exists: close auth, replay deferred action, and let the action own the feedback, for example "Saved to Favorites."
- No deferred action: navigate to the tab app and show a small "Signed in" toast.

### Dev-only

- If the API returns `testCode` and the build is non-production, show `Dev code: 123456` under resend text.
- Never show `testCode` in staging or production builds.

## Motion

| Element | Animation | Duration | Easing |
|---|---|---|---|
| Bottom sheet open | slide up from bottom + scrim fade | `slow` | `decel` |
| Bottom sheet close | slide down + scrim fade | `slow` | `accel` |
| Auth route push | native modal transition | platform | platform |
| Button press | scale + opacity feedback | `fast` | `standard` |
| OTP digit fill | subtle scale + color shift | `fast` | `standard` |
| Wrong OTP | horizontal shake, then clear | `base` | `standard` |
| Toast after direct login | slide/fade | `base` | `decel` enter, `accel` exit |
| Locale switch | text content cross-fade | `base` | `standard` |

Reduced motion: bottom sheet becomes fade-only, OTP wrong-code shake is replaced with an instant error state and focus reset, OTP digit scale is skipped.

## Accessibility

- **Contrast ratios**: `textPrimary` on `background`, `textSecondary` on `background`, `textTertiary` on `background`, brand CTA text on brand surface, and error text on background use verified token pairs from `docs/prd/ui/77-accessibility.md` and meet WCAG AA for body text.
- **Tap targets**: close, back, language choices, legal links, Change number, Resend, and primary CTA must meet the mobile target minimum from the accessibility doc. Visual icons can be smaller inside the hit area.
- **Focus-visible**: native focus ring or a `border-[var(--color-brand-500)]` focused state must be visible for input and OTP cells.
- **Screen reader**:
  - Close button label: `auth.close`
  - Back button label: `auth.backToPhone`
  - Logo accessibility label: `AutoTM`
  - OTP input label: `auth.otp.codeLabel`
  - Resend button label includes countdown when disabled.
- **Reading order**: top bar, logo, title, helper, input, errors, CTA/resend, legal text.
- **Error announcement**: wrong/expired/locked messages should be announced via live region equivalent in React Native.
- **Keyboard**: phone uses numeric keypad; OTP uses one-time-code keyboard hints and supports paste.

## Trilingual copy

Draft Turkmen copy is provisional and should be reviewed by a translator before launch.

| Key | RU | TK | EN |
|---|---|---|---|
| `auth.sheet.saveTitle` | Войдите, чтобы сохранить объявление | Bildirişi saklamak üçin giriň | Sign in to save listings |
| `auth.sheet.messageTitle` | Войдите, чтобы написать продавцу | Satyja ýazmak üçin giriň | Sign in to message the seller |
| `auth.sheet.sellTitle` | Войдите, чтобы продать машину | Awtoulag satmak üçin giriň | Sign in to sell your car |
| `auth.sheet.genericTitle` | Войдите, чтобы продолжить | Dowam etmek üçin giriň | Sign in to continue |
| `auth.sheet.body` | Продолжите по номеру телефона. | Telefon belgiňiz bilen dowam ediň. | Continue with your phone number. |
| `auth.sheet.cta` | Продолжить по телефону | Telefon bilen dowam et | Continue with phone |
| `auth.phone.title` | Введите номер телефона | Telefon belgiňizi giriziň | Enter your phone number |
| `auth.phone.helper` | Мы отправим код по SMS. | Kody SMS arkaly ibereris. | We'll send a code by SMS. |
| `auth.phone.label` | Номер телефона | Telefon belgisi | Phone number |
| `auth.phone.inputHelper` | Введите номер мобильного телефона в Туркменистане. | Türkmenistandaky mobil telefon belgisini giriziň. | Enter a Turkmenistan mobile number. |
| `auth.phone.getCode` | Получить код | Kody al | Get code |
| `auth.legal.prefix` | Продолжая, вы соглашаетесь с | Dowam etmek bilen, siz | By continuing, you agree to the |
| `auth.legal.terms` | Условиями | Ulanyş şertleri | Terms |
| `auth.legal.and` | и | we | and |
| `auth.legal.privacy` | Политикой конфиденциальности | Gizlinlik syýasaty | Privacy Policy |
| `auth.otp.title` | Введите код | Kody giriziň | Enter the code |
| `auth.otp.sent` | Код отправлен на {phone} | Kod {phone} belgisine iberildi | Code sent to {phone} |
| `auth.otp.changeNumber` | Изменить номер | Belgini üýtget | Change number |
| `auth.otp.codeLabel` | Код из SMS | SMS kody | SMS code |
| `auth.otp.resendIn` | Отправить код повторно через {seconds} с | Kody {seconds} sekuntdan gaýtadan iber | Resend code in {seconds}s |
| `auth.otp.resend` | Отправить код повторно | Kody gaýtadan iber | Resend code |
| `auth.otp.devCode` | Код для разработки: {code} | Işläp düzmek üçin kod: {code} | Dev code: {code} |
| `auth.error.phoneFormat` | Введите номер в формате +993 6X XX-XX-XX. | Belgini +993 6X XX-XX-XX görnüşinde giriziň. | Enter a number in the format +993 6X XX-XX-XX. |
| `auth.error.rateLimited` | Слишком много попыток. Попробуйте через {minutes} мин. | Synanyşyk köp. {minutes} minutdan soň synanyşyň. | Too many attempts. Try again in {minutes} minutes. |
| `auth.error.network` | Нет подключения к интернету. Попробуйте снова. | Internete birikme ýok. Täzeden synanyşyň. | No internet connection. Try again. |
| `auth.error.wrongCode` | Неверный код. Попробуйте снова. | Nädogry kod. Täzeden synanyşyň. | Wrong code. Try again. |
| `auth.error.expired` | Срок действия кода истек. Запросите новый. | Kodyň möhleti gutardy. Täze kod soraň. | Code expired. Request a new one. |
| `auth.error.locked` | Слишком много попыток. Запросите новый код. | Synanyşyk köp. Täze kod soraň. | Too many attempts. Request a new code. |
| `auth.error.used` | Этот код уже использован. Запросите новый. | Bu kod eýýäm ulanyldy. Täze kod soraň. | This code has already been used. Request a new one. |
| `auth.error.generic` | Не удалось войти. Попробуйте снова. | Girip bolmady. Täzeden synanyşyň. | Could not sign in. Try again. |
| `auth.success.signedIn` | Вы вошли | Siz girdiňiz | Signed in |
| `auth.close` | Закрыть вход | Girişi ýap | Close sign-in |
| `auth.backToPhone` | Вернуться к номеру телефона | Telefon belgisine dolan | Back to phone number |
| `notifications.chat.rationale` | Разрешите уведомления, чтобы узнать, когда продавец ответит. | Satyjy jogap berende bilmek üçin habarnamalara rugsat beriň. | Allow notifications so you know when the seller replies. |
| `notifications.savedSearch.rationale` | Разрешите уведомления, когда новые машины подходят под этот поиск. | Bu gözlege laýyk täze awtoulaglar çykanda habarnamalara rugsat beriň. | Allow notifications when new cars match this search. |
| `notifications.listing.rationale` | Разрешите уведомления о сообщениях покупателей и обновлениях объявления. | Alyjylar ýazanda ýa-da bildiriş täzelenende habarnamalara rugsat beriň. | Allow notifications when buyers message you or your listing gets updates. |
| `notifications.settingsFallback` | Уведомления выключены. Включите их в настройках системы. | Habarnamalar öçürilen. Olary ulgam sazlamalarynda açyň. | Notifications are off. Enable them in System Settings. |

## Legal agreement decision

- S2 uses implicit agreement copy under the phone CTA. No checkbox is shown.
- Terms and Privacy links open canonical web legal pages: `https://auto.tm/<locale>/legal/terms` and `https://auto.tm/<locale>/legal/privacy`.
- Add a checkbox only if legal review requires explicit recorded acceptance or versioned consent.
- If versioned consent is required later, record accepted `termsVersion`, `privacyVersion`, `acceptedAt`, and `acceptedLocale` during OTP verification or first account creation.

## SMS autofill decision

- The sender must format OTP SMS bodies for iOS and Android autofill.
- The phone-agent only sends the message body it receives; the API or SMS gateway owns the formatter.
- Use a template with the visible code, Android app hash, and iOS domain-bound code line.
- The Android app hash must be computed after the final package name and signing certificate exist.
- The gateway path is not yet fully wired: current API gateway mode logs, and `apps/sms-gateway` still uses a mock sender for fleet mode.

## Notification permission decision

- OTP login never asks for native notification permission.
- Native prompt is asked at most once automatically after a concrete notification-using action:
  - first sent chat message,
  - saved search with notify enabled,
  - first published listing,
  - blog follow,
  - explicit marketing opt-in.
- If declined, later notification features show an inline System Settings CTA instead of opening the native prompt again.
- Store `notificationPermissionPrompted=true` locally on the device; store a server push token only after permission is granted.

## Implementation notes for the engineer

- Routes: implement `apps/mobile/app/(auth)/phone.tsx` and `apps/mobile/app/(auth)/otp.tsx`.
- Navigation: bottom sheet opens `(auth)/phone`; phone route pushes `(auth)/otp`; OTP success returns to deferred action or tab app.
- Contracts: use `@auto-tm/contracts` schemas for `OtpRequestRequest`, `OtpRequestResponse`, `OtpVerifyRequest`, and `OtpVerifyResponse`.
- Phone formatting: display `+993 6X XX-XX-XX`; submit canonical `+9936XXXXXXX`.
- OTP verify payload: submit `phone`, `code`, and optional `deviceLabel`; `requestId` is not required by the backend verify contract.
- Token storage: store access and refresh tokens in `expo-secure-store` per `apps/mobile/CONTEXT.md`.
- Resume behavior: preserve phone and timer while OTP is valid; never persist entered OTP code to disk.
- Resend behavior: use backend `resendInSeconds` and recompute countdown from timestamps on resume.
- Errors: map `VALIDATION_FAILED`, `RATE_LIMITED`, `INVALID_OTP`, `OTP_EXPIRED`, `OTP_ALREADY_USED`, `OTP_LOCKED`, and `OTP_NOT_FOUND` to inline messages.
- SVG: use `apps/mobile/assets/logos_color_red.svg`; use text fallback if SVG rendering fails.
- Legal links: use `expo-linking` or the project-selected in-app browser/custom tab package when it exists. Do not deep-link `/legal/*` into the app.
- Notifications: leave prompt handling to chat/saved-search/listing flows; do not add notification permission code to OTP.

## Open questions / decisions deferred to engineer

- Decide during implementation whether the logo is imported through an SVG transformer or wrapped in a small `react-native-svg` component.
- Decide later, after testing/beta data, whether OTP needs a "Having trouble?" support link. S2 keeps it out.
- Decide in legal review whether implicit agreement copy is sufficient or explicit recorded acceptance is required.

## Self-check

- No login wall before browse.
- No confirm screen before SMS request.
- No notification prompt during OTP.
- No legal checkbox in S2.
- No support/help clutter in S2.
- No fake urgency or promotional copy.
- Error color uses error token, not brand token.
- Mobile touch targets follow the accessibility minimum.
- Both light and dark rely on semantic tokens.
- Trilingual copy is present; Turkmen is marked provisional for later review.
