import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { signIn } = useAuth();

  const GoogleIcon = () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 533.5 544.3"
      className="w-6 h-6"
    >
      <path
        d="M533.5 278.4c0-18.2-1.5-36.4-4.8-54H272v102.5h147.4c-6.4 34.8-25.4 64.4-54 84.3v69h87.3c51.1-47 80.8-116.4 80.8-201.8z"
        fill="#4285F4"
      />
      <path
        d="M272 544.3c72.6 0 133.6-24 178.2-65.2l-87.3-69c-24.3 16.3-55.5 25.9-90.9 25.9-69.8 0-129-47.1-150.1-110.5H33.9v69.5C78.3 484.1 168.2 544.3 272 544.3z"
        fill="#34A853"
      />
      <path
        d="M121.9 320.5c-5-14.8-7.8-30.6-7.8-46.5s2.8-31.7 7.8-46.5V158.1H33.9C12.1 197.7 0 241.8 0 278.5s12.1 80.8 33.9 120.4l88-78.4z"
        fill="#FBBC05"
      />
      <path
        d="M272 107.6c39.6 0 75.1 13.6 103 40.3l77.4-77.4C404.8 23.3 343.8 0 272 0 168.2 0 78.3 60.2 33.9 158.1l88 69.5c21.1-63.4 80.3-110 150.1-110z"
        fill="#EA4335"
      />
    </svg>
  );

  return (
    <div className="flex h-screen items-center justify-center">
      <button
        onClick={signIn}
        className="flex items-center gap-3 font-semibold px-6 py-3 rounded-lg shadow-lg transition-all duration-300 transform hover:-translate-y-0.5 hover:scale-105"
      >
        <GoogleIcon />
      </button>
    </div>
  );
}
