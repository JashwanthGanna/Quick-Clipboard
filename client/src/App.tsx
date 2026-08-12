import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import Layout from "./components/Layout";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import FileSharing from "./pages/FileSharing";
import FileViewer from "./pages/FileViewer";
import SelfDestructPage from "./pages/SelfDestructPage";
import SharedRooms from "./pages/SharedRooms";
import OCRPage from "./pages/OCRPage";
import DashboardPage from "./pages/DashboardPage";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import Disclaimer from "./pages/Disclaimer";

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/file-sharing" component={FileSharing} />
        <Route path="/share/:code" component={FileViewer} />
        <Route path="/self-destruct" component={SelfDestructPage} />
        <Route path="/rooms" component={SharedRooms} />
        <Route path="/room/:code" component={SharedRooms} />
        <Route path="/ocr" component={OCRPage} />
        <Route path="/dashboard" component={DashboardPage} />
        <Route path="/about" component={About} />
        <Route path="/contact" component={Contact} />
        <Route path="/privacy" component={Privacy} />
        <Route path="/terms" component={Terms} />
        <Route path="/disclaimer" component={Disclaimer} />
        <Route path="/404" component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark" switchable>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
