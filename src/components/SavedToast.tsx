import { useEffect, useState } from "react";
import { useTheme } from "../context/ThemeContext";
import { Check, Trash2, X } from "lucide-react";

type ToastType = "success" | "delete" | "error" | "info";

interface SavedToastProps {
  type?: ToastType;
  message?: string;
}

const SavedToast = ({ type = "success", message }: SavedToastProps) => {
  const { darkMode } = useTheme();
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  const getToastConfig = () => {
    switch (type) {
      case "success":
        return {
          icon: <Check className="w-4 h-4" />,
          text: message || "Saved!",
          bgColor: darkMode ? "bg-white" : "bg-black",
          textColor: darkMode ? "text-black" : "text-white",
          iconColor: darkMode ? "text-black" : "text-white",
        };
      case "delete":
        return {
          icon: <Trash2 className="w-4 h-4" />,
          text: message || "Deleted!",
          bgColor: darkMode ? "bg-white" : "bg-black",
          textColor: darkMode ? "text-black" : "text-white",
          iconColor: darkMode ? "text-black" : "text-white",
        };
      case "error":
        return {
          icon: <X className="w-4 h-4" />,
          text: message || "Error occurred",
          bgColor: darkMode ? "bg-red-500" : "bg-red-600",
          textColor: "text-white",
          iconColor: "text-white",
        };
      case "info":
        return {
          icon: <Check className="w-4 h-4" />,
          text: message || "Done!",
          bgColor: darkMode ? "bg-[#3291ff]" : "bg-[#0070f3]",
          textColor: "text-white",
          iconColor: "text-white",
        };
      default:
        return {
          icon: <Check className="w-4 h-4" />,
          text: message || "Saved!",
          bgColor: darkMode ? "bg-white" : "bg-black",
          textColor: darkMode ? "text-black" : "text-white",
          iconColor: darkMode ? "text-black" : "text-white",
        };
    }
  };

  const config = getToastConfig();

  return (
    <>
      <div
        className={`absolute bottom-6 left-1/2 -translate-x-1/2 z-[9999] ${config.bgColor} ${config.textColor} px-4 py-2.5 rounded-lg shadow-2xl border ${darkMode ? "border-zinc-800" : "border-gray-200"} animate-toast-in flex items-center gap-2.5 font-medium text-sm`}
      >
        <span className={config.iconColor}>{config.icon}</span>
        {config.text}
      </div>
      <style>
        {`
          @keyframes toast-in {
            0% { 
              opacity: 0; 
              transform: translate(-50%, 10px);
            }
            100% { 
              opacity: 1; 
              transform: translate(-50%, 0);
            }
          }
          @keyframes toast-out {
            0% { 
              opacity: 1; 
              transform: translate(-50%, 0);
            }
            100% { 
              opacity: 0; 
              transform: translate(-50%, -10px);
            }
          }
          .animate-toast-in {
            animation: toast-in 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          }
        `}
      </style>
    </>
  );
};

export default SavedToast;
