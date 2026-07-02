import Navbar from "../components/Navbar";
import Hero from "../components/Hero";
import About from "../components/About";
import Achievements from "../components/Achievements.tsx";
import Leadership from "../components/Leadership";

export default function Home() {
  return (
    <>
      <Navbar />
      <Hero />
      <About />
      <Achievements />
      <Leadership /> 
    </>
  );
}