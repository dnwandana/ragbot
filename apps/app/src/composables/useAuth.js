import { reactive, ref } from "vue"
import { useRouter } from "vue-router"
import { useAuthStore } from "../stores/auth.js"

/**
 * Composable for authentication form handling and validation rules.
 *
 * @returns {Object} Auth form state, validation rules, and action handlers.
 */
export function useAuth() {
  const authStore = useAuthStore()
  const router = useRouter()

  const formState = reactive({ email: "", password: "", confirmation_password: "", full_name: "" })
  const error = ref("")

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
      router.push({ name: "Login", query: { registered: "1" } })
    } catch (e) {
      error.value = e?.response?.data?.message || "Sign up failed"
    }
  }

  /** Logs out the user and redirects to the login page. */
  async function handleLogout() {
    await authStore.logout()
    router.push("/login")
  }

  return {
    formState,
    error,
    loading: authStore.loading,
    isAuthenticated: authStore.isAuthenticated,
    currentUser: authStore.currentUser,
    emailRules,
    passwordRules,
    confirmRules,
    fullNameRules,
    handleSignin,
    handleSignup,
    handleLogout,
  }
}
