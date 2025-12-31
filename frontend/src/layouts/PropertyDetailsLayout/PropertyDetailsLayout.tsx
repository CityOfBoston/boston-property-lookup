import { useEffect, useRef, useState } from "react";
import Banner from "../Banner";
import Footer from "../Footer";
import Header from "../Header";
import { IconButton } from "@components/IconButton";
import { PropertySearchPopup } from "@components/PropertySearchPopup";
import { FeedbackSenderContainer } from "@containers/FeedbackSenderContainer";
import { getComponentText } from "@utils/contentMapper";
import styles from "./PropertyDetailsLayout.module.scss";
import backToTop from "../../assets/back_to_top.png";

// Add useMediaQuery hook
const useMediaQuery = (query: string) => {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    if (media.matches !== matches) {
      setMatches(media.matches);
    }
    const listener = () => setMatches(media.matches);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [matches, query]);

  return matches;
};

interface Section {
  name: string;
  component: React.ReactNode;
}

interface PropertyDetailsLayoutProps {
  /**
   * Ordered list of sections with their names and components
   */
  sections: Section[];
  /**
   * Parcel ID for the property
   */
  parcelId: string;
}

/**
 * The PropertyDetailsLayout component provides a layout structure for property details pages
 * with a search button in header, collapsible search popup, and sticky section navigation.
 * 
 * It includes:
 * - City of Boston Banner
 * - Sticky Header with search button
 * - Collapsible PropertySearchPopup
 * - Sticky horizontal section navigation
 * - Content sections with proper spacing
 * - Footer
 * 
 * ## Features
 * - **Sticky Header**: The header becomes fixed at the top of the viewport when scrolling past the banner
 * - **Search Popup**: Opens below header when search button is clicked
 * - **Section Navigation**: Sticky horizontal nav bar with section links
 * - **Smooth Scrolling**: Clicking section links smoothly scrolls to the section
 * - **Responsive Design**: Works on all screen sizes
 * 
 * @example
 * ```tsx
 * import PropertyDetailsLayout from './layouts/PropertyDetailsLayout/PropertyDetailsLayout';
 * 
 * function PropertyDetailsPage() {
 *   const sections = [
 *     { name: 'Overview', component: <OverviewSection /> },
 *     { name: 'Details', component: <DetailsSection /> },
 *   ];
 * 
 *   return <PropertyDetailsLayout sections={sections} />;
 * }
 * ```
 */
export default function PropertyDetailsLayout({ sections, parcelId }: PropertyDetailsLayoutProps) {
  const layoutContent = getComponentText('PropertyDetailsLayout', 'layouts.PropertyDetailsLayout');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const headerRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const sectionRefs = useRef<(HTMLDivElement | null)[]>([]);
  
  // Add media query for desktop
  const isDesktop = useMediaQuery('(min-width: 769px)');

  useEffect(() => {
    const handleScroll = () => {
      const banner = document.querySelector('.cob-site-banner');
      if (!banner || !headerRef.current || !mainRef.current || !navRef.current) return;
      
      // Show back to top button after scrolling 500px
      setShowBackToTop(window.scrollY > 500);
      
      const bannerHeight = banner.getBoundingClientRect().height;
      const headerHeight = headerRef.current.getBoundingClientRect().height;
      const searchPopupHeight = isSearchOpen ? document.querySelector('.PropertySearchPopup')?.getBoundingClientRect().height || 0 : 0;
      
      // Apply sticky behavior when scrolled past the banner
      if (window.scrollY > bannerHeight) {
        headerRef.current.classList.add('stickyActive');
        mainRef.current.classList.add('headerIsSticky');
        navRef.current.classList.add('stickyActive');
        
        // Adjust nav position based on header and search popup
        navRef.current.style.top = `${headerHeight + searchPopupHeight}px`;
      } else {
        headerRef.current.classList.remove('stickyActive');
        mainRef.current.classList.remove('headerIsSticky');
        navRef.current.classList.remove('stickyActive');
        navRef.current.style.top = '';
      }
    };
    
    // Set elements heights as CSS variables for layout calculations
    if (headerRef.current) {
      const headerHeight = headerRef.current.getBoundingClientRect().height;
      document.documentElement.style.setProperty('--header-height', `${headerHeight}px`);
    }
    
    if (navRef.current) {
      const navHeight = navRef.current.getBoundingClientRect().height;
      document.documentElement.style.setProperty('--nav-height', `${navHeight}px`);
    }
    
    const banner = document.querySelector('.cob-site-banner');
    if (banner) {
      const bannerHeight = banner.getBoundingClientRect().height;
      document.documentElement.style.setProperty('--banner-height', `${bannerHeight}px`);
    }
    
    const footer = document.querySelector('.cob-slim-footer');
    if (footer) {
      const footerHeight = footer.getBoundingClientRect().height;
      document.documentElement.style.setProperty('--footer-height', `${footerHeight}px`);
    }
    
    // Add event listeners
    window.addEventListener('scroll', handleScroll);
    window.addEventListener('resize', () => {
      handleScroll();
      
      // Update height variables on resize
      if (headerRef.current) {
        const headerHeight = headerRef.current.getBoundingClientRect().height;
        document.documentElement.style.setProperty('--header-height', `${headerHeight}px`);
      }
      
      if (navRef.current) {
        const navHeight = navRef.current.getBoundingClientRect().height;
        document.documentElement.style.setProperty('--nav-height', `${navHeight}px`);
      }
      
      const banner = document.querySelector('.cob-site-banner');
      if (banner) {
        const bannerHeight = banner.getBoundingClientRect().height;
        document.documentElement.style.setProperty('--banner-height', `${bannerHeight}px`);
      }
      
      const footer = document.querySelector('.cob-slim-footer');
      if (footer) {
        const footerHeight = footer.getBoundingClientRect().height;
        document.documentElement.style.setProperty('--footer-height', `${footerHeight}px`);
      }
    });
    
    // Initial check
    handleScroll();
    
    // Clean up
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, [isSearchOpen]);

  const scrollToSection = (index: number) => {
    const section = sectionRefs.current[index];
    if (!section) return;

    const headerHeight = headerRef.current?.getBoundingClientRect().height || 0;
    const navHeight = navRef.current?.getBoundingClientRect().height || 0;
    const searchPopupHeight = isSearchOpen ? document.querySelector('.PropertySearchPopup')?.getBoundingClientRect().height || 0 : 0;
    const offset = headerHeight + navHeight + searchPopupHeight;

    window.scrollTo({
      top: section.offsetTop - offset,
      behavior: 'smooth'
    });
  };

  return (
    <div className={styles.propertyDetailsLayout}>
      {/* Banner at the top */}
      <Banner />
      
      {/* Header with search button */}
      <div ref={headerRef} className={styles.headerWrapper}>
        <Header 
          additionalContent={
            <>
              <img
                src="/cob-uswds/img/usa-icons/search.svg"
                alt={layoutContent.searchButton.mobileAlt}
                className={styles.mobileSearchIcon}
                onClick={() => setIsSearchOpen(!isSearchOpen)}
              />
              {isDesktop && (
                <IconButton
                  src="/cob-uswds/img/usa-icons/search.svg"
                  text={layoutContent.searchButton.text}
                  onClick={() => setIsSearchOpen(!isSearchOpen)}
                  useLoraFont={true}
                />
              )}
            </>
          } 
        />
        {isSearchOpen && (
          <PropertySearchPopup 
            onClose={() => setIsSearchOpen(false)} 
            texts={{
              closeButtonAriaLabel: layoutContent.searchPopup.closeButtonAriaLabel,
              labelText: layoutContent.searchButton.text
            }}
          />
        )}
      </div>
      
      {/* Section navigation */}
      <nav ref={navRef} className={styles.sectionNav}>
        <div className={styles.navContent}>
          {sections.map((section, index) => (
            <button
              key={section.name}
              onClick={() => scrollToSection(index)}
              className={styles.navButton}
            >
              {section.name.toUpperCase()}
            </button>
          ))}
        </div>
      </nav>
      
      {/* Main content with sections */}
      <main ref={mainRef} className={styles.main}>
        <div>
          <h1 className={styles.detailsTitle}>{layoutContent.title}</h1>
          {sections.map((section, index) => (
            <div
              key={section.name}
              ref={el => sectionRefs.current[index] = el}
              className={styles.section}
            >
              {section.component}
            </div>
          ))}
          <div className={styles.feedbackSenderWrapper}>
            <FeedbackSenderContainer parcelId={parcelId} />
          </div>
        </div>
      </main>
      
      {/* Footer at the bottom */}
      <Footer />

      {/* Back to top button */}
      <button
        className={`${styles.backToTop} ${showBackToTop ? styles.visible : ''}`}
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        aria-label="Back to top"
      >
        <img src={backToTop} alt="Back to top" />
      </button>
    </div>
  );
} 