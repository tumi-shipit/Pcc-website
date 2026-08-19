import Navbar from "../components/Navbar";
import Hero from "../components/Hero";
import LatestNews from "../components/LatestNews";
import About from "../components/About";
import Achievements from "../components/Achievements";
import Tournaments from "../components/Tournaments";
import Leadership from "../components/Leadership";
import TrustDetails from "../components/TrustDetails";
import VerifiedRecords from "../components/VerifiedRecords";
import Footer from "../components/footer";

export default function Home() {
  return (
    <>
      <Navbar />
      <Hero />

      {/* Latest News */}
      <LatestNews />

      <About />
      <TrustDetails />
      <VerifiedRecords />
      <Achievements />
      <Tournaments />
      <Leadership />
      <Footer />
    </>
  );
}
