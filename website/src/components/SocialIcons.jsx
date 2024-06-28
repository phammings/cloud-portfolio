import { motion } from "framer-motion";

/**
 * Represents a component displaying social media icons.
 *
 * This component displays social media icons with animation effects.
 *
 * @component
 */

const SocialIcons = () => {
  // Define styles for the icons
  const styles = {
    icon: {
      textDecoration: "none",
      fontSize: "22px",
      padding: "10px",
      transition: "0.2s ease-in",
    },
  };

  return (
    <div className="socialIcons" style={styles.socialIcons}>
      <a className="icon" style={styles.icon} href="https://github.com/phammings" target="_blank">
        {/* GitHub Icon */}
        <motion.i
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 1.8, duration: 0.5, type: "spring" }}
          className="fa-brands fa-github"
          aria-hidden="true"
          title="Ryan Pham's GitHub Profile"
        ></motion.i>
      </a>
      <a className="icon" style={styles.icon} href="https://www.linkedin.com/in/ryan-pham-b102051a2/" target="_blank">
        {/* LinkedIn Icon */}
        <motion.i
          initial={{ y1: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 1.7, duration: 0.5, type: "spring" }}
          className="fa-brands fa-linkedin"
          aria-hidden="true"
          title="Ryan Pham's LinkedIn Profile"
        ></motion.i>
      </a>
      <a className="icon" style={styles.icon} href="https://github.com/phammings/cloud-portfolio/blob/resume/Ryan_Pham_resume.pdf" target="_blank">
        {/* Resume Icon */}
        <motion.i
          initial={{ y1: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 1.6, duration: 0.5, type: "spring" }}
          className="fa-solid fa-file-pdf"
          aria-hidden="true"
          title="Ryan Pham's Resume"
        ></motion.i>
      </a>
    </div>
  );
};

export default SocialIcons;
