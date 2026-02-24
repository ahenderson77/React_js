import { useState, useEffect } from 'react';
import './App.css';
import { db, taskdata } from './firebase'
import { addDoc, doc, onSnapshot, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { getDocs } from 'firebase/firestore';


function Title() {
  return <h1>My Task List</h1>
}

function App() {
  // state -- task list
  const testlist = [
    { id: 1, content: "milk", status: "cool" },
    { id: 2, content: "bread", status: "complete" },
    { id: 3, content: "eggs", status: "hot" }
  ];
  // tasklist -----> listitems
  const [tasklist, setTaskslist] = useState([]);
  const [count, setcount] = useState(4);
  //add action listen to database changes
  useEffect(() => {
    const snap = onSnapshot(taskdata, (snapshot) => {
      const tasks = snapshot.docs.map((doc) => ({
        id: doc.id,
        content: doc.data().content,
        status: doc.data().status,
        style: doc.data().style
      }));
      setTaskslist(tasks);
    });
    return () => snap(); // Clean up the listener on unmount
  }, [])
  //CRUD operations
  async function addTask(event) {
    if (event.key === "Enter") {
      const newDocref = doc(taskdata);
      const newtask = { id: newDocref.id, content: event.target.value, status:"cool"};
      setTaskslist([...tasklist, newtask]);
      event.target.value = "";
      // Add the new task to Firestore
      await setDoc(newDocref, newtask);
    }
  }
  function clearlist() {
    setTaskslist([]);
    setcount(1);
  }

  const changeStatus = async (id) => {
    const statusOrder = ["cool", "hot", "complete"];
    
    setTaskslist((prev) =>
      prev.map((task) => {
        if (task.id !== id) return task;
        const currentIndex = statusOrder.indexOf(task.status);
        const nextIndex = (currentIndex + 1) % statusOrder.length;
        return { ...task, status: statusOrder[nextIndex] };
      })
    );
  }

  async function deleteitem() {
    const deletedTasks = tasklist.filter((task) => task.status === "complete");
    const newList = tasklist.filter((task) => task.status !== "complete");
    setTaskslist(newList); // update the GUI

    deletedTasks.forEach(async (task) => {
      await deleteDoc(doc(taskdata, task.id)); // delete from Firestore
    });
  }

  // tasklist -----> listitems UI component
  const listitems = tasklist.map((task) => (
    <li
      key={task.id}
      className={`task-item ${task.status}`}
      onClick={() => changeStatus(task.id)}
    >
      {task.content}
    </li>
  ));

  const savedata = async () => {
    for (const task of tasklist) {
      const datasnap = await getDocs(taskdata);
      datasnap.forEach((doc) => {
        console.log(doc.id, " => ", doc.data());
      });
    }
  }

  return (
    <div className="app test">
      <Title />
      <button onClick={savedata}>Save</button>
      <ul>{listitems} </ul>
      <input type="text" placeholder="Enter" onKeyDown={addTask} />
      <button onClick={clearlist}>Clear All</button>
      <button onClick={deleteitem}>Delete Completed</button>
    </div>
  )
}

export default App
