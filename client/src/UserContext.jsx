import { createContext, useEffect, useState } from "react";
import axios from "axios";
export const UserContext = createContext({});

export function UserContextProvider({ children }) {
  const [userName, setUserName] = useState(null);
  const [id, setId] = useState(null);
  useEffect(() => {
    axios.get("/profile").then((response) => {
      setId(response.data.userId);
      setUserName(response.data.username);
    });
  }, []);

  return (
    <UserContext.Provider value={{ userName, setUserName, id, setId }}>
      {children}
    </UserContext.Provider>
  );
}
