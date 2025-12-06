import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../Context/authContext";
import { SearchBar } from "./SearchBar";
import DarkModeToggle from "./DarkModeToggle";
import { NSFWModal } from "./NSFWModal";
import { Icon } from '@iconify/react';
import {
  Nav,
  Container,
  Brand,
  Menu,
  MenuItem,
  MenuLink,
  Actions,
  MobileToggle,
  DropdownMenu,
  UserAvatar
} from './Header.styles';

export const Header = ({ favs, isDarkMode, toggleTheme }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showNSFWModal, setShowNSFWModal] = useState(false);
  const [isNSFWDropdownOpen, setIsNSFWDropdownOpen] = useState(false);
  const [isExploreDropdownOpen, setIsExploreDropdownOpen] = useState(false);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.dropdown-trigger')) {
        setIsNSFWDropdownOpen(false);
        setIsExploreDropdownOpen(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const handleNSFWConfirm = () => {
    localStorage.setItem('nsfw_allowed', 'true');
    setShowNSFWModal(false);
  };

  return (
    <Nav>
      <Container>
        <Brand to="/">
          <Icon icon="bi:play-circle-fill" />
          AnimeNexus
        </Brand>

        <MobileToggle onClick={() => setMobileMenuOpen(!isMobileMenuOpen)}>
          <Icon icon="bi:list" />
        </MobileToggle>

        <Menu $isOpen={isMobileMenuOpen}>
          <MenuItem>
            <MenuLink to="/">
              <Icon icon="bi:house-door" /> Home
            </MenuLink>
          </MenuItem>

          <MenuItem className="dropdown-trigger">
            <MenuLink
              as="span"
              style={{ cursor: 'pointer' }}
              onClick={(e) => {
                e.stopPropagation();
                setIsExploreDropdownOpen(!isExploreDropdownOpen);
                setIsNSFWDropdownOpen(false);
              }}
            >
              <Icon icon="bi:compass" /> Explore
              <Icon icon={isExploreDropdownOpen ? "bi:chevron-up" : "bi:chevron-down"} style={{ fontSize: '0.7rem', marginLeft: '0.25rem' }} />
            </MenuLink>
            <DropdownMenu $isOpen={isExploreDropdownOpen}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <h6 style={{ opacity: 0.7, marginBottom: '0.5rem', fontSize: '0.8rem' }}>GENRES</h6>
                  <MenuLink to="/genre/action">Action</MenuLink>
                  <MenuLink to="/genre/adventure">Adventure</MenuLink>
                  <MenuLink to="/genre/comedy">Comedy</MenuLink>
                  <MenuLink to="/genre/drama">Drama</MenuLink>
                  <MenuLink to="/genre/fantasy">Fantasy</MenuLink>
                </div>
                <div>
                  <h6 style={{ opacity: 0.7, marginBottom: '0.5rem', fontSize: '0.8rem' }}>DISCOVER</h6>
                  <MenuLink to="/coming-soon" style={{ color: '#a78bfa' }}>
                    <Icon icon="bi:hourglass-split" /> Coming Soon
                  </MenuLink>
                  <MenuLink to="/cinemas" style={{ color: '#fbbf24' }}>
                    <Icon icon="bi:film" /> In Cinemas
                  </MenuLink>

                  <MenuLink to="/recommendations" style={{ color: '#34d399' }}>
                    <Icon icon="bi:gem" /> Hidden Gems
                  </MenuLink>
                  <MenuLink to="/moods" style={{ color: '#ec4899' }}>
                    <Icon icon="bi:emoji-smile-fill" /> Mood Explorer
                  </MenuLink>
                </div>
              </div>
            </DropdownMenu>
          </MenuItem>
          <MenuItem>
            <MenuLink to="/manga-guide" style={{ color: '#00d4ff' }}>
              <Icon icon="bi:book-half" /> Manga Guide
            </MenuLink>
          </MenuItem>
          {/* +18 Section - Show dropdown directly, auth handled on page */}
          <MenuItem className="dropdown-trigger">
            <MenuLink
              as="span"
              style={{ cursor: 'pointer', color: '#ef4444' }}
              onClick={(e) => {
                e.stopPropagation();
                setIsNSFWDropdownOpen(!isNSFWDropdownOpen);
                setIsExploreDropdownOpen(false);
              }}
            >
              <Icon icon="bi:fire" /> +18
              <Icon icon={isNSFWDropdownOpen ? "bi:chevron-up" : "bi:chevron-down"} style={{ fontSize: '0.7rem', marginLeft: '0.25rem' }} />
            </MenuLink>
            <DropdownMenu $isOpen={isNSFWDropdownOpen}>
              <MenuLink to="/nsfw/hot-characters" style={{ color: '#ef4444' }}>
                <Icon icon="bi:heart-fill" /> 🔥 Hot Characters
              </MenuLink>
              <MenuLink to="/nsfw/brutal-moments" style={{ color: '#ef4444' }}>
                <Icon icon="bi:droplet-fill" /> 🩸 Brutal Moments
              </MenuLink>
            </DropdownMenu>
          </MenuItem>

          {
            user && (
              <>
                <MenuItem>
                  <MenuLink to="/favoritos">
                    <Icon icon="bi:heart" /> My List
                  </MenuLink>
                </MenuItem>
                <MenuItem>
                  <MenuLink to="/history">
                    <Icon icon="bi:clock-history" /> History
                  </MenuLink>
                </MenuItem>
              </>
            )
          }
        </Menu >

        <Actions>
          <SearchBar />
          {/* <DarkModeToggle isDarkMode={isDarkMode} toggleTheme={toggleTheme} /> */}

          {user ? (
            <div style={{ position: 'relative' }}>
              <UserAvatar onClick={() => navigate('/profile')} title="Go to Profile">
                {user.email ? user.email[0].toUpperCase() : <Icon icon="bi:person-fill" />}
              </UserAvatar>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '1rem' }}>
              <MenuLink to="/login">Login</MenuLink>
              <MenuLink to="/register" style={{
                background: '#00d4ff',
                color: '#0b0c15',
                padding: '0.5rem 1rem',
                borderRadius: '4px',
                fontWeight: 'bold'
              }}>Sign Up</MenuLink>
            </div>
          )}
        </Actions>
      </Container >

      {
        showNSFWModal && (
          <NSFWModal
            onConfirm={handleNSFWConfirm}
            onCancel={() => setShowNSFWModal(false)}
          />
        )
      }
    </Nav >
  );
};
