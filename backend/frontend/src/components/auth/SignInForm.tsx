import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { EyeCloseIcon, EyeIcon } from "../../icons";
import Label from "../form/Label";
import Input from "../form/input/InputField";
import Button from "../ui/button/Button";

export default function SignInForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [nomPrenom, setNomPrenom] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  // ✅ Fonction appelée lors de la soumission du formulaire
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!nomPrenom || !password) {
      setError("Veuillez remplir tous les champs !");
      return;
    }

    try {
      // 🔹 Requête POST vers ton API Spring Boot
  const response = await fetch("http://localhost:8080/api/auth/login", {

        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
       body: JSON.stringify({ nomPrenom, password }),

      });

      const data = await response.json();

      // 🔹 Si connexion réussie
      if (response.ok && data.success) {
        // Tu peux stocker le token ou les infos utilisateur
        localStorage.setItem("user", JSON.stringify(data.user));

        // ✅ Rediriger vers la page basic-tables
        navigate("/basic-tables");
      } else {
        setError(data.message || "username ou mot de passe incorrect !");
      }
    } catch (err) {
      console.error("Erreur de connexion :", err);
      setError("Erreur de connexion au serveur (port 8080) !");
    }
  };

  return (
    <div className="flex flex-col flex-1">
      <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto">
        <div>
          <div className="mb-5 sm:mb-8">
            <h1 className="mb-2 font-semibold text-gray-800 text-title-sm dark:text-white/90 sm:text-title-md">
              Sign In
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Enter your username and password to sign in!
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="space-y-6">
              <div>
                <Label>
                  Username <span className="text-error-500">*</span>{" "}
                </Label>
                <Input
                  placeholder="Entrez votre nom d'utilisateur"
                  value={nomPrenom} // renommer le state
                  onChange={(e) => setNomPrenom(e.target.value)}
                />
              </div>


              <div>
                <Label>
                  Password <span className="text-error-500">*</span>{" "}
                </Label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <span
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute z-30 -translate-y-1/2 cursor-pointer right-4 top-1/2"
                  >
                    {showPassword ? (
                      <EyeIcon className="fill-gray-500 dark:fill-gray-400 size-5" />
                    ) : (
                      <EyeCloseIcon className="fill-gray-500 dark:fill-gray-400 size-5" />
                    )}
                  </span>
                </div>
              </div>

              {/* 🔴 Message d'erreur si échec */}
              {error && (
                <p className="text-sm text-red-500 text-center">{error}</p>
              )}

              <div>
                <Button className="w-full" size="sm" type="submit">
                  Sign in
                </Button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
