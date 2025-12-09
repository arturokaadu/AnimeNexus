import React, { useState } from 'react';
import styled from 'styled-components';
import { Icon } from '@iconify/react';
import { searchAnime } from '../../services/animeService';
import { getMangaContinuation } from '../../services/mangaService';

// ============ STYLED COMPONENTS ============

const Container = styled.div`
  padding: 2rem;
  max-width: 900px;
  margin: 0 auto;
  color: ${({ theme }) => theme.colors.text.primary};
`;

const Header = styled.div`
  text-align: center;
  margin-bottom: 2.5rem;
`;

const Title = styled.h1`
  font-size: 2.5rem;
  margin-bottom: 0.75rem;
  background: linear-gradient(45deg, #00d4ff, #a78bfa);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
`;

const Subtitle = styled.p`
  color: rgba(255, 255, 255, 0.7);
  font-size: 1.1rem;
`;

const SearchSection = styled.div`
  background: rgba(255, 255, 255, 0.05);
  padding: 1.5rem;
  border-radius: 16px;
  margin-bottom: 2rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 1rem 1.25rem;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  color: white;
  font-size: 1rem;
  transition: all 0.2s ease;

  &:focus {
    outline: none;
    border-color: #00d4ff;
    box-shadow: 0 0 0 2px rgba(0, 212, 255, 0.2);
  }

  &::placeholder {
    color: rgba(255, 255, 255, 0.4);
  }
`;

const ResultsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1rem;
  margin-top: 1.5rem;
`;

const AnimeCard = styled.div`
  background: rgba(255, 255, 255, 0.05);
  border-radius: 10px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 2px solid transparent;

  &:hover {
    transform: translateY(-4px);
    border-color: #00d4ff;
    background: rgba(255, 255, 255, 0.08);
  }
`;

const CardImage = styled.img`
  width: 100%;
  height: 120px;
  object-fit: cover;
`;

const CardContent = styled.div`
  padding: 0.75rem;
`;

const CardTitle = styled.h3`
  font-size: 0.9rem;
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const CardMeta = styled.span`
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.5);
`;

const SelectedAnimeSection = styled.div`
  background: linear-gradient(135deg, rgba(0, 212, 255, 0.1), rgba(167, 139, 250, 0.1));
  padding: 1.5rem;
  border-radius: 16px;
  border: 1px solid rgba(0, 212, 255, 0.3);
  margin-bottom: 1.5rem;
`;

const SelectedAnimeHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
`;

const SelectedImage = styled.img`
  width: 80px;
  height: 110px;
  object-fit: cover;
  border-radius: 8px;
`;

const SelectedInfo = styled.div`
  flex: 1;
`;

const SelectedTitle = styled.h2`
  margin: 0 0 0.25rem 0;
  font-size: 1.3rem;
  color: #00d4ff;
`;

const EpisodeForm = styled.div`
  display: flex;
  gap: 1rem;
  align-items: flex-end;

  @media (max-width: 600px) {
    flex-direction: column;
    align-items: stretch;
  }
`;

const FormGroup = styled.div`
  flex: 1;
  
  label {
    display: block;
    font-size: 0.85rem;
    color: rgba(255, 255, 255, 0.7);
    margin-bottom: 0.5rem;
  }

  input {
    width: 100%;
    padding: 0.75rem 1rem;
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 6px;
    color: white;
    font-size: 1rem;

    &:focus {
      outline: none;
      border-color: #00d4ff;
    }
  }
`;

const SubmitButton = styled.button`
  padding: 0.75rem 2rem;
  background: linear-gradient(45deg, #00d4ff, #00a3cc);
  color: white;
  border: none;
  border-radius: 6px;
  font-weight: bold;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 4px 15px rgba(0, 212, 255, 0.4);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const ResultCard = styled.div`
  background: rgba(0, 0, 0, 0.4);
  border-radius: 12px;
  padding: 1.5rem;
  border-left: 4px solid ${({ $confidence }) =>
    $confidence === 'high' ? '#10b981' :
      $confidence === 'medium' ? '#f59e0b' : '#ef4444'
  };
`;

const ConfidenceBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.35rem 0.85rem;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: bold;
  margin-bottom: 1rem;
  background: ${({ $level }) =>
    $level === 'high' ? 'rgba(16, 185, 129, 0.2)' :
      $level === 'medium' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(239, 68, 68, 0.2)'
  };
  color: ${({ $level }) =>
    $level === 'high' ? '#34d399' :
      $level === 'medium' ? '#fbbf24' : '#f87171'
  };
  border: 1px solid currentColor;
`;

const MainResult = styled.div`
  display: flex;
  gap: 2rem;
  margin: 1.5rem 0;
  flex-wrap: wrap;
`;

const ResultBox = styled.div`
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(59, 130, 246, 0.2));
  padding: 1.25rem 1.5rem;
  border-radius: 10px;
  text-align: center;
  min-width: 140px;
`;

const ResultLabel = styled.div`
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.6);
  margin-bottom: 0.35rem;
`;

const ResultValue = styled.div`
  font-size: 2rem;
  font-weight: bold;
  color: #fbbf24;
`;

const ReasoningBox = styled.div`
  background: rgba(255, 255, 255, 0.05);
  padding: 1rem;
  border-radius: 8px;
  margin-top: 1rem;
  border-left: 3px solid #60a5fa;
`;

const ReasoningText = styled.p`
  margin: 0;
  font-size: 0.95rem;
  color: rgba(255, 255, 255, 0.85);
  line-height: 1.5;
  font-style: italic;
`;

const SpecialNote = styled.div`
  background: rgba(245, 158, 11, 0.1);
  border: 1px solid rgba(245, 158, 11, 0.3);
  padding: 0.75rem 1rem;
  border-radius: 8px;
  margin-top: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #fbbf24;
  font-size: 0.9rem;
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 1rem;
  margin-top: 1.5rem;
  flex-wrap: wrap;
`;

const ActionButton = styled.a`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.65rem 1.25rem;
  background: ${({ $primary }) => $primary
    ? 'linear-gradient(45deg, #10b981, #059669)'
    : 'rgba(255, 255, 255, 0.1)'
  };
  color: white;
  text-decoration: none;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.9rem;
  transition: all 0.2s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }
`;

const ClearButton = styled.button`
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.5);
  cursor: pointer;
  font-size: 0.85rem;
  margin-top: 1rem;
  
  &:hover {
    color: white;
  }
`;

const LoadingSpinner = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding: 2rem;
  color: rgba(255, 255, 255, 0.6);
`;

// ============ COMPONENT ============

export const MangaGuide = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedAnime, setSelectedAnime] = useState(null);
  const [episode, setEpisode] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);

  // Handle anime search
  const handleSearch = async (e) => {
    const query = e.target.value;
    setSearchQuery(query);

    if (query.length < 3) {
      setSearchResults([]);
      return;
    }

    setSearchLoading(true);
    try {
      const data = await searchAnime(query, 1);
      setSearchResults(data.data?.slice(0, 8) || []);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setSearchLoading(false);
    }
  };

  // Handle anime selection
  const handleSelectAnime = (anime) => {
    setSelectedAnime(anime);
    setSearchQuery('');
    setSearchResults([]);
    setResult(null);
    setEpisode('');
  };

  // Handle form submission
  const handleFindChapter = async () => {
    if (!selectedAnime || !episode) return;

    setLoading(true);
    setResult(null);

    try {
      const data = await getMangaContinuation(selectedAnime.title, parseInt(episode));
      setResult(data);
    } catch (error) {
      console.error('Error:', error);
      setResult({
        chapter: null,
        confidence: 'low',
        reasoning: 'An error occurred while fetching data.'
      });
    } finally {
      setLoading(false);
    }
  };

  // Clear selection
  const handleClear = () => {
    setSelectedAnime(null);
    setResult(null);
    setEpisode('');
  };

  return (
    <Container>
      <Header>
        <Title>📖 Manga Guide</Title>
        <Subtitle>
          Find exactly where to continue reading the manga after watching an anime
        </Subtitle>
      </Header>

      {/* Search Section */}
      {!selectedAnime && (
        <SearchSection>
          <SearchInput
            type="text"
            placeholder="Search for an anime (e.g., Frieren, Chainsaw Man, Jujutsu Kaisen)..."
            value={searchQuery}
            onChange={handleSearch}
          />

          {searchLoading && (
            <LoadingSpinner>
              <Icon icon="eos-icons:loading" style={{ fontSize: '1.5rem' }} />
              Searching...
            </LoadingSpinner>
          )}

          {searchResults.length > 0 && (
            <ResultsGrid>
              {searchResults.map((anime) => (
                <AnimeCard key={anime.mal_id} onClick={() => handleSelectAnime(anime)}>
                  <CardImage
                    src={anime.images?.jpg?.large_image_url}
                    alt={anime.title}
                  />
                  <CardContent>
                    <CardTitle>{anime.title}</CardTitle>
                    <CardMeta>
                      {anime.type} • {anime.episodes || '?'} eps • {anime.year || 'N/A'}
                    </CardMeta>
                  </CardContent>
                </AnimeCard>
              ))}
            </ResultsGrid>
          )}
        </SearchSection>
      )}

      {/* Selected Anime + Episode Input */}
      {selectedAnime && (
        <SelectedAnimeSection>
          <SelectedAnimeHeader>
            <SelectedImage
              src={selectedAnime.images?.jpg?.large_image_url}
              alt={selectedAnime.title}
            />
            <SelectedInfo>
              <SelectedTitle>{selectedAnime.title}</SelectedTitle>
              <CardMeta>
                {selectedAnime.type} • {selectedAnime.episodes || '?'} episodes • {selectedAnime.year || ''}
              </CardMeta>
            </SelectedInfo>
          </SelectedAnimeHeader>

          <EpisodeForm>
            <FormGroup>
              <label>What episode did you watch up to?</label>
              <input
                type="number"
                placeholder={`1 - ${selectedAnime.episodes || '?'}`}
                value={episode}
                onChange={(e) => setEpisode(e.target.value)}
                min="1"
                max={selectedAnime.episodes || 9999}
              />
            </FormGroup>
            <SubmitButton onClick={handleFindChapter} disabled={!episode || loading}>
              {loading ? (
                <>
                  <Icon icon="eos-icons:loading" />
                  Finding...
                </>
              ) : (
                <>
                  <Icon icon="bi:search" />
                  Find Chapter
                </>
              )}
            </SubmitButton>
          </EpisodeForm>

          <ClearButton onClick={handleClear}>
            ← Choose a different anime
          </ClearButton>
        </SelectedAnimeSection>
      )}

      {/* Results */}
      {result && (
        <ResultCard $confidence={result.confidence}>
          <ConfidenceBadge $level={result.confidence}>
            <Icon icon={
              result.confidence === 'high' ? 'bi:check-circle-fill' :
                result.confidence === 'medium' ? 'bi:exclamation-circle-fill' :
                  'bi:question-circle-fill'
            } />
            {result.confidence === 'high' ? 'Verified Data' :
              result.confidence === 'medium' ? 'Estimated' :
                'Approximate'}
          </ConfidenceBadge>

          {result.chapter ? (
            <>
              <MainResult>
                <ResultBox>
                  <ResultLabel>Continue from</ResultLabel>
                  <ResultValue>Ch. {result.chapter}</ResultValue>
                </ResultBox>
                {result.volume && (
                  <ResultBox>
                    <ResultLabel>In Volume</ResultLabel>
                    <ResultValue>Vol. {result.volume}</ResultValue>
                  </ResultBox>
                )}
                {result.buyVolume && (
                  <ResultBox>
                    <ResultLabel>Buy</ResultLabel>
                    <ResultValue>Vol. {result.buyVolume}</ResultValue>
                  </ResultBox>
                )}
              </MainResult>

              {result.reasoning && (
                <ReasoningBox>
                  <ReasoningText>"{result.reasoning}"</ReasoningText>
                </ReasoningBox>
              )}

              {result.specialNotes && (
                <SpecialNote>
                  <Icon icon="bi:info-circle-fill" />
                  {result.specialNotes}
                </SpecialNote>
              )}

              <ActionButtons>
                <ActionButton
                  $primary
                  href={`https://www.google.com/search?q=buy+${encodeURIComponent(selectedAnime.title)}+manga+volume+${result.buyVolume || result.volume || 1}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Icon icon="bi:cart-fill" />
                  Find Volume {result.buyVolume || result.volume || 1} to Buy
                </ActionButton>
                <ActionButton
                  href={`https://www.google.com/search?q=read+${encodeURIComponent(selectedAnime.title)}+manga+chapter+${result.chapter}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Icon icon="bi:book" />
                  Find Where to Read
                </ActionButton>
              </ActionButtons>
            </>
          ) : (
            <ReasoningBox>
              <ReasoningText>{result.reasoning}</ReasoningText>
            </ReasoningBox>
          )}

          {result.sourceMaterial && result.sourceMaterial !== 'Manga' && (
            <SpecialNote>
              <Icon icon="bi:lightbulb-fill" />
              Source: {result.sourceMaterial}
            </SpecialNote>
          )}
        </ResultCard>
      )}
    </Container>
  );
};
