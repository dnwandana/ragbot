---
title: Accounts & Signing In
---

# Accounts & signing in

<p class="lede">Everything in RAGBot lives behind an account. Here's how to create one, get in, and recover access if you're locked out.</p>

## Create an account

Open the app and choose **Create an account** from the sign-in screen. Enter your full name, work email, and a password (at least 8 characters), then confirm the password.

<AuthCardMock variant="signup" />

After you sign up, RAGBot sends a **verification email**. Open it and follow the link to confirm your address — you can't sign in until your email is verified. If it doesn't arrive, you can request a fresh link from the verification screen.

::: info Why verification?
Confirming your email keeps accounts tied to real, reachable addresses — important when teammates invite each other into shared workspaces.
:::

## Sign in

Once verified, return to the sign-in screen, enter your email and password, and choose **Sign in**. You'll land on your **Workspaces** list, ready to pick up where you left off.

<AuthCardMock variant="login" />

RAGBot keeps you signed in securely and refreshes your session in the background, so you rarely have to log in again on the same device.

::: warning Too many failed attempts
For your protection, repeated incorrect passwords temporarily lock an account. If that happens, wait a few minutes and try again — or reset your password to be sure.
:::

## Forgot your password

Choose **Forgot password?** on the sign-in screen and enter your email. If an account exists, RAGBot sends a reset link. Open it, choose a new password, and you're back in. Resetting your password signs out any other active sessions, so anyone who shouldn't have access is pushed out.

<AuthCardMock variant="forgot" />

::: info "If the email exists…"
For privacy, RAGBot always shows the same confirmation whether or not the address is registered — so the screen never reveals which emails have accounts.
:::

## First time in? Onboarding

The very first time you sign in **without a workspace**, RAGBot drops you into a short setup wizard instead of an empty dashboard. It walks you through creating your first workspace (and, optionally, inviting teammates, adding a knowledge source, and creating an agent). See [Onboarding](/getting-started/onboarding) for the full walkthrough.

## Sign out

Use **Sign out** at the bottom of the sidebar whenever you're done — especially on a shared computer. It ends your session immediately.

## Next steps

<Cards>
  <Card to="/getting-started/quick-start" icon="bolt" title="Quick Start" desc="From an empty workspace to your first answered question in five steps." />
  <Card to="/concepts/account" icon="user" title="Your profile & account" desc="Set your name and timezone, change your password, switch to dark mode, or close your account." />
</Cards>
