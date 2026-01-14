import React from 'react';
import styled from 'styled-components';
import { Icon } from '@iconify/react';

const Button = styled.button`
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  outline: none;
  z-index: 20; /* Ensure it floats above other elements */

  &:hover {
    transform: scale(1.2);
  }

  &:active {
    transform: scale(0.9);
  }
`;

export const FavoriteButton = ({ isFav, onClick, size = 24 }) => {
    const handleClick = (e) => {
        // CRITICAL: Stop event from bubbling up to parent Link or Card
        e.preventDefault();
        e.stopPropagation();

        // Call the parent handler
        if (onClick) {
            onClick(e);
        }
    };

    return (
        <Button
            onClick={handleClick}
            aria-label={isFav ? "Remove from favorites" : "Add to favorites"}
            title={isFav ? "Remove from favorites" : "Add to favorites"}
            type="button"
        >
            <Icon
                icon={isFav ? "bi:heart-fill" : "bi:heart"}
                width={size}
                height={size}
                color={isFav ? "#ff0055" : "rgba(255, 255, 255, 0.5)"}
                style={{
                    filter: isFav ? 'drop-shadow(0 0 8px rgba(255, 0, 85, 0.5))' : 'none',
                    transition: 'all 0.3s ease'
                }}
            />
        </Button>
    );
};
