import axios from "axios";
import { UserContextProvider } from "./UserContext";
import Routes from "./Routes";

function App() {
  axios.defaults.baseURL = "http://localhost:4020";
  axios.defaults.withCredentials = true;

  return (
    <UserContextProvider>
      <div className="">
        <Routes />
      </div>
    </UserContextProvider>
  );
}

export default App;
