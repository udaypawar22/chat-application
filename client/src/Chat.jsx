import { useContext, useEffect, useRef, useState } from "react";
import Logo from "./Logo";
import { UserContext } from "./UserContext";
import { keys, uniqBy } from "lodash";
import axios from "axios";
import Contacts from "./Contacts";

export default function Chat() {
  const [ws, setWs] = useState(null);
  const [onlinePeople, setOnlinePeople] = useState({});
  const [selectedUser, setSelectedUser] = useState(null);
  const [newMsgText, setNewMsgText] = useState("");
  const [messages, setMessages] = useState([]);
  const [offlinePeople, setOfflinePeople] = useState({});
  const { userName, id, setId, setUserName } = useContext(UserContext);
  const chatContainerRef = useRef(null);
  const bucket = "mernchatapp";

  useEffect(() => {
    connectToWs();
  }, []);

  function connectToWs() {
    const ws = new WebSocket(import.meta.env.VITE_API_WS_URL);
    setWs(ws);
    ws.addEventListener("message", handleMsg);
    ws.addEventListener("close", () => {
      setTimeout(() => {
        console.log("Disconnected, trying to reconnect...");
        connectToWs();
      }, 1000);
    });
  }

  function showOnlinePeople(peopleArray) {
    const people = {};
    peopleArray.forEach(({ userId, username }) => {
      people[userId] = username;
    });
    setOnlinePeople(people);
  }

  function handleMsg(e) {
    const msgData = JSON.parse(e.data);
    if ("online" in msgData) {
      showOnlinePeople(msgData.online);
    } else if ("text" in msgData || "file" in msgData) {
      setMessages((prev) => [
        ...prev,
        {
          ...msgData,
        },
      ]);
    }
  }

  function sendMsg(ev, file = null) {
    if (ev) ev.preventDefault();
    ws.send(
      JSON.stringify({
        recipient: selectedUser,
        text: newMsgText,
        file,
      })
    );
    setNewMsgText("");
    if (file) {
      setTimeout(() => {
        axios.get("/messages/" + selectedUser).then((res) => {
          setMessages(res.data);
        });
      }, 5000);
    } else {
      setMessages((prev) => [
        ...prev,
        {
          text: newMsgText,
          sender: id,
          recipient: selectedUser,
          _id: Date.now(),
        },
      ]);
    }
  }

  function sendFile(ev) {
    const reader = new FileReader();
    reader.readAsDataURL(ev.target.files[0]);
    reader.onload = () => {
      sendMsg(null, {
        name: ev.target.files[0].name,
        data: reader.result,
      });
    };
  }

  function logout() {
    axios.post("/logout").then(() => {
      setWs(null);
      setId(null);
      setUserName(null);
      window.location.reload();
    });
  }

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    axios.get("/people").then((res) => {
      const offlinePeopleArr = res.data
        .filter((p) => p._id !== id)
        .filter((p) => !Object.keys(onlinePeople).includes(p._id));
      const offlinePeople = {};
      offlinePeopleArr.forEach((p) => {
        offlinePeople[p._id] = p.username;
      });
      setOfflinePeople(offlinePeople);
    });
  }, [onlinePeople]);

  useEffect(() => {
    if (selectedUser) {
      axios.get("/messages/" + selectedUser).then((res) => {
        setMessages(res.data);
      });
    }
  }, [selectedUser]);

  const peopleWithoutLoggedInUser = { ...onlinePeople };
  delete peopleWithoutLoggedInUser[id];

  const filteredMessages = uniqBy(messages, "_id");

  return (
    <div className="flex h-screen">
      <div className="flex flex-col bg-white w-1/3 xl:w-1/4 border-r border-gray-100">
        <div className="flex-grow overflow-y-scroll thin-scroll">
          <Logo />
          {Object.keys(peopleWithoutLoggedInUser).map((userId) => (
            <Contacts
              key={userId}
              id={userId}
              online={true}
              username={peopleWithoutLoggedInUser[userId]}
              onClick={() => setSelectedUser(userId)}
              selected={userId === selectedUser}
            />
          ))}
          {Object.keys(offlinePeople).map((userId) => (
            <Contacts
              key={userId}
              id={userId}
              online={false}
              username={offlinePeople[userId]}
              onClick={() => setSelectedUser(userId)}
              selected={userId === selectedUser}
            />
          ))}
        </div>
        <div className="p-2 text-center">
          <button
            onClick={logout}
            className="text-white bg-blue-500 p-2 border w-full rounded-md"
          >
            Logout
          </button>
        </div>
      </div>
      <div className="bg-blue-100 w-2/3 xl:w-3/4 flex flex-col">
        <div
          ref={chatContainerRef}
          className="flex-grow overflow-y-scroll thin-scroll"
        >
          {!selectedUser && (
            <Logo
              classNameDiv={"w-fit mx-auto min-h-full text-4xl opacity-80"}
              classNameLogo={"w-12 h-12"}
            />
          )}
          {!!selectedUser && (
            <div className="">
              {filteredMessages.map((message) => (
                <div
                  key={message._id}
                  className={
                    "mx-2 " +
                    (message.sender === id
                      ? "text-right pl-28 md:pl-36 lg:pl-96"
                      : "text-left pr-28  md:pr-36 lg:pr-96")
                  }
                >
                  <div
                    className={
                      "inline-block p-2 my-2 rounded text-sm w-fit " +
                      (message.sender === id
                        ? "bg-blue-500 text-white text-left"
                        : "bg-white text-gray-800")
                    }
                  >
                    {message.text}
                    {message.file && (
                      <div>
                        <a
                          target="_blank"
                          className="border-b flex gap-1 items-center"
                          href={`https://${bucket}.s3.amazonaws.com/${message.file}`}
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={1.5}
                            stroke="currentColor"
                            className="w-4 h-4"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13"
                            />
                          </svg>
                          {message.file}
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        {!!selectedUser && (
          <form className="flex gap-2 p-2" onSubmit={sendMsg}>
            <input
              value={newMsgText}
              onChange={(ev) => setNewMsgText(ev.target.value)}
              type="text"
              className="bg-white p-2 flex-grow rounded"
              placeholder="type your message..."
            />
            <label className="mx-1 px-2 bg-gray-50 rounded-full cursor-pointer">
              <input onChange={sendFile} type="file" className="hidden" />
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-6 h-full"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13"
                />
              </svg>
            </label>
            <button
              type="submit"
              className="bg-blue-500 p-2 text-white rounded"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-6 h-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
                />
              </svg>
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
