import { useState, useEffect } from 'react';
import './App.css';
import { taskdata, auth, googleProvider } from './firebase'
import { doc, onSnapshot, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';

function Title() {
  return <h1>My Task List</h1>
}

const handlesignin = async () => {
  try {
    googleProvider.setCustomParameters({ prompt: 'select_account' });
    await signInWithPopup(auth, googleProvider);

    return true;
  }
  catch (error) {
    console.error("Error signing in: ", error);
    return false;
  }
};

const handlesignout = async () => {
  try {
    await signOut(auth);
    // Handle successful sign-out, e.g., update UI or clear user information
  }
  catch (error) {
    console.error("Error signing out: ", error);
  }
};

function App() {
  // tasklist -----> listitems
  const [tasklist, setTaskslist] = useState([]);
  const [user, setUser] = useState(null);
  const [sortMode, setSortMode] = useState('time');
  const allowedInputRegex = /^[A-Za-z0-9 ]+$/;

  const getCreatedAtTime = (value) => {
    if (!value) return 0;
    if (value instanceof Date) return value.getTime();
    if (typeof value?.toDate === 'function') return value.toDate().getTime();
    if (typeof value === 'number') return value;

    const parsed = new Date(value).getTime();
    return Number.isNaN(parsed) ? 0 : parsed;
  };

  const persistSortedOrder = async (sortedTasks) => {
    try {
      await Promise.all(
        sortedTasks.map((task, index) => updateDoc(doc(taskdata, task.id), { sort_index: index }))
      );
    } catch (error) {
      console.error('Error persisting sorted order: ', error);
    }
  };

  const sortTasks = (tasks, mode) => {
    if (mode === 'priority') {
      const priorityOrder = { hot: 0, cool: 1, complete: 2 };
      return [...tasks].sort((firstTask, secondTask) => {
        const firstPriority = priorityOrder[firstTask.status] ?? 3;
        const secondPriority = priorityOrder[secondTask.status] ?? 3;
        return firstPriority - secondPriority;
      });
    }

    if (mode === 'user') {
      return [...tasks].sort((firstTask, secondTask) => {
        const firstUser = firstTask.created_by ?? '';
        const secondUser = secondTask.created_by ?? '';

        if (!firstUser && !secondUser) return 0;
        if (!firstUser) return 1;
        if (!secondUser) return -1;

        return firstUser.localeCompare(secondUser);
      });
    }

    return [...tasks].sort(
      (firstTask, secondTask) =>
        getCreatedAtTime(firstTask.created_at) - getCreatedAtTime(secondTask.created_at)
    );
  };

  //add action listen to database changes
  useEffect(() => {
    const snap = onSnapshot(taskdata, (snapshot) => {
      const tasks = sortTasks(
        snapshot.docs.map((doc) => ({
          id: doc.id,
          content: doc.data().content,
          status: doc.data().status,
          style: doc.data().style,
          created_by: doc.data().created_by,
          created_at: doc.data().created_at,
          sort_index: doc.data().sort_index,
        })),
        sortMode
      );
      setTaskslist(tasks);
    });
    return () => snap(); // Clean up the listener on unmount
  }, [sortMode])

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });

    return () => unsubscribe();
  }, []);
  //CRUD operations
  async function addTask(event) {
    if (event.key === "Enter") {
      if (!user) {
        const isSignedIn = await handlesignin();
        if (!isSignedIn) return;
        return;
      }

      const taskContent = event.target.value.trim();
      if (!taskContent) return;

      if (!allowedInputRegex.test(taskContent)) {
        alert("Only letters, numbers, and spaces are allowed.");
        return;
      }

      const newDocref = doc(taskdata);
      const newtask = {
        id: newDocref.id,
        content: taskContent,
        status: "cool",
        created_by: user?.uid,
        created_at: new Date(),
        sort_index: tasklist.length,
      };
      const nextTasks = sortTasks([...tasklist, newtask], sortMode);
      setTaskslist(nextTasks);
      event.target.value = "";
      // Add the new task to Firestore
      await setDoc(newDocref, newtask);
      await persistSortedOrder(nextTasks);
    }
  }

  const changeStatus = async (id) => {
    const statusOrder = ["hot", "cool", "complete"];
    const currentTask = tasklist.find((task) => task.id === id);
    if (!currentTask) return;

    const currentIndex = statusOrder.indexOf(currentTask.status);
    const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % statusOrder.length;
    const nextStatus = statusOrder[nextIndex];

    setTaskslist((prev) =>
      prev.map((task) => (task.id === id ? { ...task, status: nextStatus } : task))
    );

    try {
      await updateDoc(doc(taskdata, id), { status: nextStatus });
    } catch (error) {
      console.error("Error updating task status: ", error);
    }
  }

  async function deleteitem() {
    const deletedTasks = tasklist.filter((task) => task.status === "complete");
    const newList = tasklist.filter((task) => task.status !== "complete");
    setTaskslist(newList); // update the GUI

    deletedTasks.forEach(async (task) => {
      await deleteDoc(doc(taskdata, task.id)); // delete from Firestore
    });
  }

  async function sortByPriority() {
    const sortedTasks = sortTasks(tasklist, 'priority');

    setSortMode('priority');
    setTaskslist(sortedTasks);
    await persistSortedOrder(sortedTasks);
  }

  async function sortByChronological() {
    const sortedTasks = sortTasks(tasklist, 'time');

    setSortMode('time');
    setTaskslist(sortedTasks);
    await persistSortedOrder(sortedTasks);
  }

  async function sortByUser() {
    const sortedTasks = sortTasks(tasklist, 'user');

    setSortMode('user');
    setTaskslist(sortedTasks);
    await persistSortedOrder(sortedTasks);
  }

  async function handleSortSelection(event) {
    const selectedSort = event.target.value;

    if (selectedSort === 'priority') await sortByPriority();
    if (selectedSort === 'time') await sortByChronological();
    if (selectedSort === 'user') await sortByUser();

    event.target.value = '';
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

  return (
    <div className="app test">
      <Title />
      <ul>{listitems} </ul>
      <input type="text" placeholder="Enter" onKeyDown={addTask} />
      <select defaultValue="" onChange={handleSortSelection}>
        <option value="" disabled>Sort Tasks</option>
        <option value="priority">By Priority</option>
        <option value="time">By Time Added</option>
        <option value="user">By User</option>
      </select>
      <button onClick={deleteitem}>Delete Completed</button>
      <button className='counter_button' onClick={user ? handlesignout : handlesignin}>
        {user ? 'Sign Out' : 'Sign in with Google'}
      </button>
    </div>
  )
}

export default App
