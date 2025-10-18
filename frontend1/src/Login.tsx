import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [nomPrenom, setNomPrenom] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  const navigate = useNavigate(); // hook pour la redirection

  const handleLogin = async () => {
    try {
      const response = await fetch("http://localhost:8080/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nomPrenom, password }),
      });

      const role = await response.text();

      if (role === "ADMIN") {
        setMessage("Bienvenue Admin !");
        navigate("/homepage"); // redirection vers homepage
      } else if (role === "USER") {
        setMessage("Bienvenue User !");
        navigate("/homepage"); // redirection vers homepage
      } else {
        setMessage(role); // message d'erreur
      }
    } catch (error) {
      setMessage("Erreur serveur");
    }
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2>Login</h2>
      <input
        placeholder="Nom et prénom"
        value={nomPrenom}
        onChange={(e) => setNomPrenom(e.target.value)}
        style={{ marginBottom: "10px", display: "block" }}
      />
      <input
        type="password"
        placeholder="Mot de passe"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        style={{ marginBottom: "10px", display: "block" }}
      />
      <button onClick={handleLogin}>Se connecter</button>
      <p>{message}</p>
    </div>
  );
}
