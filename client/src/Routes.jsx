import { useContext } from "react";
import { UserContext } from "./UserContext";
import RegisterAndLoginForm from "./RegisterAndLoginForm";
import Chat from "./Chat";

export default function Routes() {
  const { userName } = useContext(UserContext);
  if (userName) {
    return <Chat />;
  }
  return <RegisterAndLoginForm />;
}
