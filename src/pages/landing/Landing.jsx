import React, { useEffect, useState } from "react";
import Hero from "../../components/Hero";
import Draw from "../../components/Draw";

/**
 * Represents the Landing page component.
 * Displays the main landing page content including Hero, Drawing, and About sections.
 *
 * @component
 * @param {string} name - The name of the user displayed in the Hero section.
 */

const Landing = ({ name }) => {
  const [views, setViews] = useState(null);

  useEffect(() => {
    async function fetchViews() {
      try {
        let response = await fetch("https://xaymp6qbh7mam2ljub7azb4xvy0miasj.lambda-url.ca-central-1.on.aws/"); // Replace with your actual API endpoint
        let data = await response.json();
        setViews(data); // Adjust according to your API response structure
      } catch (error) {
        console.error("Error fetching view count:", error);
      }
    }

    fetchViews();
  }, []);

  // Inline styles for the main landing container
  const styles = {
    landing: {
      height: "calc(100% - 93px)",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
    },
  };

  return (
    <>
      {/* Main Landing Page */}
      <main className="landing container" style={styles.landing}>
        {/* Display the drawing component */}
        <Draw />

        {/* Conditionally render the hero component only when views is not null */}
        {views !== null && <Hero name={name} views={views} />}
      </main>

      {/* Display the about section */}
      {/* <About /> */}
    </>
  );
};

export default Landing;
