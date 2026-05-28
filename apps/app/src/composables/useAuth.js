import { reactive, ref } from "vue"
import { useRouter } from "vue-router"
import { storeToRefs } from "pinia"
import { useAuthStore } from "../stores/auth.js"

/**
 * Composable for authentication form handling and validation rules.
 *
 * @returns {Object} Auth form state, validation rules, and action handlers.
 */
export function useAuth() {
  const authStore = useAuthStore()
  const { loading, isAuthenticated, currentUser } = storeToRefs(authStore)
  const router = useRouter()

  const formState = reactive({ email: "", password: "", confirmation_password: "", full_name: "" })
  const error = ref("")
  const sent = ref(false)

  const emailRules = [
    { required: true, message: "Email is required" },
    { type: "email", message: "Enter a valid email" },
  ]
  const passwordRules = [
    { required: true, message: "Password is required" },
    { min: 8, message: "Password must be at least 8 characters" },
  ]
  const confirmRules = [{ required: true, message: "Please confirm your password" }]
  const fullNameRules = [
    { required: true, message: "Full name is required" },
    { max: 100, message: "Full name cannot exceed 100 characters" },
  ]
  const resetPasswordConfirmRules = [
    { required: true, message: "Please confirm your password" },
    {
      validator: (_, value) =>
        !value || value === formState.password
          ? Promise.resolve()
          : Promise.reject("Passwords do not match"),
    },
  ]

  /** Signs in the user and redirects to the intended page. */
  async function handleSignin() {
    error.value = ""
    try {
      await authStore.signin(formState.email, formState.password)
      const redirect = router.currentRoute.value.query.redirect || "/workspaces"
      router.push(redirect)
    } catch (e) {
      error.value = e?.response?.data?.message || "Sign in failed"
    }
  }

  /** Registers a new user and redirects to login with a success indicator. */
  async function handleSignup() {
    error.value = ""
    try {
      await authStore.signup(formState)
      router.push({ name: "VerifyEmail", query: { email: formState.email } })
    } catch (e) {
      error.value = e?.response?.data?.message || "Sign up failed"
    }
  }

  /** Submits the forgot-password request and flips `sent` on success. */
  async function handleForgotPassword() {
    error.value = ""
    try {
      await authStore.forgotPassword(formState.email)
      sent.value = true
    } catch (e) {
      error.value = e?.response?.data?.message || "Failed to send reset link."
    }
  }

  /** Logs out the user and redirects to the login page. */
  function handleLogout() {
    void authStore.logout()
    router.push("/login")
  }

  return {
    formState,
    error,
    loading,
    isAuthenticated,
    currentUser,
    sent,
    emailRules,
    passwordRules,
    confirmRules,
    fullNameRules,
    resetPasswordConfirmRules,
    handleSignin,
    handleSignup,
    handleLogout,
    handleForgotPassword,
  }
}
