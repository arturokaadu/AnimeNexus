import React from 'react';
import styled from 'styled-components';
import { Link } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { FavoriteButton } from './FavoriteButton';
import { StreamingBadges } from './StreamingBadges';

const Card = styled.div`
  position: relative;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  overflow: hidden;
  transition: transform 0.2s, box-shadow 0.2s;
  height: 100%;
  display: flex;
  flex-direction: column;

  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 10px 20px rgba(0, 0, 0, 0.3);
    background: rgba(255, 255, 255, 0.08);
  }
`;

const ImageContainer = styled.div`
  position: relative;
  padding-top: 140%; /* Aspect Ratio */
  overflow: hidden;
`;

const CardImage = styled.img`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s;

  ${Card}:hover & {
    transform: scale(1.05);
  }
`;

const Badge = styled.div`
  position: absolute;
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: bold;
  color: white;
  z-index: 2;
  backdrop-filter: blur(4px);
  box-shadow: 0 2px 4px rgba(0,0,0,0.2);

  ${props => props.$position === 'top-right' && `
    top: 8px;
    right: 8px;
  `}

  ${props => props.$position === 'bottom-left' && `
    bottom: 8px;
    left: 8px;
    background: #ef4444;
  `}
`;

const CardContent = styled.div`
  padding: 1rem;
  display: flex;
  flex-direction: column;
  flex-grow: 1;
  gap: 0.5rem;
`;

const CardTitle = styled.h3`
  margin: 0;
  font-size: 1rem;
  color: white;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  line-height: 1.4;
`;

const MetaInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.6);
`;

const TagContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
`;

const Tag = styled.span`
  background: rgba(255, 255, 255, 0.1);
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.7rem;
  color: rgba(255, 255, 255, 0.8);
`;

const CardFooter = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: auto;
  padding-top: 0.5rem;
`;

const Rating = styled.span`
  color: #fbbf24;
  font-weight: bold;
  font-size: 0.9rem;
`;

const CardLink = styled(Link)`
  text-decoration: none;
  color: inherit;
  display: flex;
  flex-direction: column;
  height: 100%;
`;

export const AnimeCard = ({ anime, isFav, onHeartClick }) => {
  const mainTag = anime.genres?.[0] ? (
    <Tag>{anime.genres[0].name}</Tag>
  ) : null;

  const detailUrl = `/detalle?id=${anime.mal_id}`;

  return (
    <Card>
      {/* 1. Image Area - Clickable Link */}
      <CardLink to={detailUrl}>
        <ImageContainer>
          <CardImage src={anime.images?.jpg?.large_image_url} alt={anime.title} loading="lazy" />
          {anime.score && (
            <Badge $position="top-right" style={{ background: 'rgba(0,0,0,0.7)' }}>
              ★ {anime.score}
            </Badge>
          )}
          {/* Status and Episode count badges */}
          <div style={{
            position: 'absolute',
            bottom: '8px',
            left: '8px',
            display: 'flex',
            gap: '4px',
            flexWrap: 'wrap'
          }}>
            {(anime.status === 'Currently Airing' || anime._isAiring) && (
              <Badge $position="custom" style={{
                position: 'relative',
                background: '#10b981',
                color: 'white'
              }}>
                🔴 Airing
              </Badge>
            )}

          </div>
        </ImageContainer>
      </CardLink>

      <CardContent>
        {/* 2. Text Area - Clickable Link */}
        <CardLink to={detailUrl} style={{ flexGrow: 0, height: 'auto', marginBottom: '0.5rem' }}>
          <CardTitle title={anime.title}>{anime.title}</CardTitle>
        </CardLink>

        {/* 3. Meta & Tags - Non-clickable or Separate */}
        <MetaInfo>
          <span>
            <Icon icon="bi:calendar-event" style={{ marginRight: '4px' }} />
            {anime.aired?.from ? new Date(anime.aired.from).getFullYear() : 'N/A'}
          </span>
          {anime.studios?.[0]?.name && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Icon icon="bi:building" />
              {anime.studios[0].name}
            </span>
          )}
        </MetaInfo>

        <TagContainer style={{ marginTop: '0.5rem' }}>
          {mainTag}
        </TagContainer>

        <div style={{ margin: '0.5rem 0', minHeight: '24px' }}>
          <StreamingBadges
            title={anime.title}
            licensors={anime.licensors}
            compact={true}
          />
        </div>

        {/* 4. Footer & Heart - COMPLETELY OUTSIDE LINK */}
        <CardFooter>
          <Rating>★ {anime.score || '?'}</Rating>

          <FavoriteButton
            isFav={isFav}
            onClick={(e) => onHeartClick(e, anime)}
            size={28}
          />
        </CardFooter>
      </CardContent>
    </Card>
  );
};
