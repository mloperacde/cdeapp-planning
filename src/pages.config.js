import Timeline from './pages/Timeline';
import Employees from './pages/Employees';
import Machines from './pages/Machines';
import Layout from './Layout.jsx';


export const PAGES = {
    "Timeline": Timeline,
    "Employees": Employees,
    "Machines": Machines,
}

export const pagesConfig = {
    mainPage: "Timeline",
    Pages: PAGES,
    Layout: Layout,
};