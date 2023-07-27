import { useContext, useState } from "react";
import axios from "axios";
import { UserContext } from "./UserContext";
export default function RegisterAndLoginForm() {
  const [userName, setUserName] = useState("");
  const [password, setPassword] = useState("");
  const [isLoginOrRegister, setIsLoginOrRegister] = useState("register");
  const { setUserName: setLoggedInUserName, setId } = useContext(UserContext);
  async function handleSubmit(ev) {
    ev.preventDefault();
    const url = isLoginOrRegister === "register" ? "register" : "login";
    const { data } = await axios.post(`/${url}`, { userName, password });
    setLoggedInUserName(userName);
    setId(data.id);
  }
  return (
    <div className="bg-blue-50 h-screen flex items-center">
      <form className="w-64 mx-auto mb-12" onSubmit={handleSubmit}>
        <input
          value={userName}
          onChange={(ev) => setUserName(ev.target.value)}
          type="text"
          placeholder="username"
          className="block w-full rounded-sm p-2 mb-2 border"
        />
        <input
          value={password}
          onChange={(ev) => setPassword(ev.target.value)}
          type="password"
          placeholder="password"
          className="rounded-sm block w-full p-2 mb-2 border"
        />
        <button className="bg-blue-500 text-white block w-full rounded-sm p-2">
          {isLoginOrRegister === "register" ? "Register" : "Login"}
        </button>
        <div className="text-center mt-2">
          {isLoginOrRegister === "register" && (
            <div>
              Already a member?{" "}
              <button
                onClick={() => setIsLoginOrRegister("login")}
                className="text-blue-500 underline"
              >
                login
              </button>
            </div>
          )}
          {isLoginOrRegister === "login" && (
            <div>
              Dont have an account?{" "}
              <button
                onClick={() => setIsLoginOrRegister("register")}
                className="text-blue-500 underline"
              >
                register
              </button>
            </div>
          )}
        </div>
      </form>
    </div>
  );
}
