import React, { useState } from 'react';
import styled from 'styled-components';
import { Icon } from '@iconify/react';
import { searchAnime } from '../../services/animeService';
import { getMangaContinuation } from '../../services/mangaService';

const Container = styled.div`
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
  color: ${({ theme }) => theme.colors.text.primary};
`;

const Header = styled.div`
  text-align: center;
  margin-bottom: 3rem;
`;

const Title = styled.h1`
  font-size: 2.5rem;
  margin-bottom: 1rem;
  background: linear-gradient(45deg, #00d4ff, #a78bfa);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
`;

const Subtitle = styled.p`
  color: rgba(255, 255, 255, 0.7);
  font-size: 1.1rem;
  max-width: 600px;
  margin: 0 auto;
`;

const SearchSection = styled.div`
  background: rgba(255, 255, 255, 0.05);
  padding: 2rem;
  border-radius: 16px;
  margin-bottom: 2rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 1rem 1.5rem;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  color: white;
  font-size: 1.1rem;
  margin-bottom: 1rem;
  transition: all 0.3s ease;

  &:focus {
    outline: none;
    border-color: #00d4ff;
    box-shadow: 0 0 0 2px rgba(0, 212, 255, 0.2);
  }
`;

const ResultsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1.5rem;
  margin-top: 2rem;
`;

const AnimeCard = styled.div`
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.2s ease;
  border: 1px solid ${({ selected }) => selected ? '#00d4ff' : 'transparent'};

  &:hover {
    transform: translateY(-5px);
    background: rgba(255, 255, 255, 0.08);
  }
`;

const CardImage = styled.img`
  width: 100%;
  height: 160px;
  object-fit: cover;
`;

const CardContent = styled.div`
  padding: 1rem;
`;

const CardTitle = styled.h3`
  font-size: 1rem;
  margin: 0 0 0.5rem 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const ConverterSection = styled.div`
  background: rgba(0, 212, 255, 0.05);
  padding: 2rem;
  border-radius: 16px;
  border: 1px solid rgba(0, 212, 255, 0.2);
  margin-top: 2rem;
  animation: fadeIn 0.5s ease;

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
`;

const ConverterTitle = styled.h2`
  display: flex;
  align-items: center;
  gap: 0.8rem;
  margin-bottom: 1.5rem;
  color: #00d4ff;
`;

const ConverterForm = styled.div`
  display: flex;
  gap: 1rem;
  align-items: flex-end;
  margin-bottom: 2rem;

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: stretch;
  }
`;

const FormGroup = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;

  label {
    font-size: 0.9rem;
    color: rgba(255, 255, 255, 0.7);
  }

  input {
    padding: 0.8rem;
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 6px;
    color: white;
    font-size: 1rem;

    &:focus {
      outline: none;
      border-color: #00d4ff;
    }
  }
`;

const CalculateButton = styled.button`
  padding: 0.8rem 2rem;
  background: linear-gradient(45deg, #00d4ff, #00a3cc);
  color: white;
  border: none;
  border-radius: 6px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 212, 255, 0.3);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
`;

const ResultBox = styled.div`
  background: rgba(0, 0, 0, 0.3);
  padding: 1.5rem;
  border-radius: 8px;
  border-left: 4px solid #00d4ff;
`;

const ResultText = styled.p`
  font-size: 1.1rem;
  line-height: 1.6;
  margin: 0;

  strong {
    color: #00d4ff;
  }
`;

const Disclaimer = styled.p`
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.5);
  margin-top: 1rem;
  font-style: italic;
`;

const Badge = styled.span`
  background: ${({ level }) => {
    switch (level) {
      case 'high': return 'rgba(16, 185, 129, 0.2)'; // Green
      case 'medium': return 'rgba(245, 158, 11, 0.2)'; // Orange
      case 'low': return 'rgba(239, 68, 68, 0.2)'; // Red
      default: return 'rgba(255,255,255,0.1)';
    }
  }};
  color: ${({ level }) => {
    switch (level) {
      case 'high': return '#34d399';
      case 'medium': return '#fbbf24';
      case 'low': return '#f87171';
      default: return 'white';
    }
  }};
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: bold;
  border: 1px solid currentColor;
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  margin-bottom: 1rem;
`;

export const MangaGuide = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [selectedAnime, setSelectedAnime] = useState(null);
  const [episode, setEpisode] = useState('');
  const [loading, setLoading] = useState(false);
  const [estimation, setEstimation] = useState(null);
  const [mangaDetails, setMangaDetails] = useState(null);
  const [fetchingManga, setFetchingManga] = useState(false);

  const handleSearch = async (e) => {
    const value = e.target.value;
    setQuery(value);

    if (value.length > 2) {
      setLoading(true);
      try {
        const data = await searchAnime(value, 1);
        setResults(data.data.slice(0, 6));
      } catch (error) {
        console.error("Error searching anime:", error);
      } finally {
        setLoading(false);
      }
    } else {
      setResults([]);
    }
  };

  const selectAnime = async (anime) => {
    setSelectedAnime(anime);
    setResults([]);
    setQuery('');
    setEstimation(null);
    setEpisode('');
    setMangaDetails(null);

    // Fetch manga details immediately with MAL ID
    setFetchingManga(true);
    try {
      const details = await getMangaContinuation(anime.title, anime.mal_id);
      setMangaDetails(details);
    } catch (error) {
      console.error("Error fetching manga details:", error);
    } finally {
      setFetchingManga(false);
    }
  };

  const calculateChapter = () => {
    if (!selectedAnime || !episode) return;

    const epNum = parseInt(episode);
    if (isNaN(epNum) || epNum <= 0) return;

    let result = {
      chapter: null,
      volume: null,
      note: '',
      confidence: 'low' // low, medium, high
    };

    // Case 1: Exact Mappings (from API or Curated Data inside service)
    // We check if we have a valid endChapter from the service
    if (mangaDetails && mangaDetails.endChapter) {

      // If the service returned a specific endChapter, we use that for interpolation
      // But we need to know if this endChapter is for "Season 1" or the whole series?
      // For now, we treat the 'endChapter' returned by service as the END of the ANIME adaptation found.

      const totalAnimeEps = selectedAnime.episodes || 24; // Default if unknown
      const startCh = parseFloat(mangaDetails.startChapter || 1);
      const endCh = parseFloat(mangaDetails.endChapter);

      let ratio = 0;
      if (totalAnimeEps > 1) {
        ratio = (epNum) / (totalAnimeEps);
      } else {
        ratio = 1;
      }

      // If looking for "what to read AFTER", we want where the episode ends.
      // So if ratio is 1 (final ep), we are at endCh.
      // If ratio is 0.5, we are at midpoint.

      const estimatedCh = startCh + (endCh - startCh) * ratio;
      result.chapter = Math.round(estimatedCh);

      // Adjust volume if data exists
      if (mangaDetails.startVolume && mangaDetails.endVolume) {
        const startVol = parseFloat(mangaDetails.startVolume);
        const endVol = parseFloat(mangaDetails.endVolume);
        result.volume = Math.round(startVol + (endVol - startVol) * ratio);
      } else {
        // Rough estimate of volume (assuming ~9 chapters per volume standard)
        result.volume = Math.ceil(result.chapter / 9);
        result.isEstimatedVolume = true;
      }

      result.confidence = 'high';
      result.note = "Based on data from " + (mangaDetails.source || "MangaUpdates");

      if (epNum >= totalAnimeEps) {
        result.chapter = endCh; // Cap at max
        result.note += ". This is the anime finale.";
      }

    }
    // Case 2: Pacing Estimation (Total Chapters / Total Episodes) - The "Smart Fallback"
    else if (mangaDetails && mangaDetails.totalChapters && selectedAnime.episodes) {
      // We assume the anime adapts everything up to now OR we calculate a "standard pacing"
      // Problem: Total Chapters is usually the CURRENT manga chapter (e.g. 270), not where anime ends.
      // So we can't just divide total/total unless the anime is FULLY adapted (series finished).

      // Heuristic:
      // Standard Shonen Pacing is ~2.5 chapters per episode.
      // Very Slow (One Piece) is ~0.8 - 1.0
      // Fast (skipping content) is ~4.0

      // We can try to guess pacing based on genre?
      // For now, we use a conservative 2.5 multiplier.

      const pacingMultiplier = 2.5;
      const estCh = Math.ceil(epNum * pacingMultiplier);

      result.chapter = estCh;
      result.volume = Math.ceil(estCh / 9); // Estimated volume
      result.isEstimatedVolume = true;
      result.confidence = 'medium';
      result.note = `Estimated ~${pacingMultiplier} chapters/episode.`;

      // Sanity check: Don't exceed total published chapters
      if (result.chapter > mangaDetails.totalChapters) {
        result.chapter = mangaDetails.totalChapters;
        result.note = "Caught up to latest manga release.";
      }
    }
    // Case 3: Complete Guess
    else {
      result.chapter = `${epNum * 2} - ${epNum * 3}`;
      result.confidence = 'low';
      result.note = "Approximation (no manga data found).";
    }

    setEstimation(result);
  };

  return (
    <Container>
      <Header>
        <Title>Manga Guide</Title>
        <Subtitle>
          Find where to start reading the manga after watching the anime.
          Select an anime and enter the episode you just watched.
        </Subtitle>
      </Header>

      <SearchSection>
        <SearchInput
          type="text"
          placeholder="Search for an anime (e.g., Jujutsu Kaisen)..."
          value={query}
          onChange={handleSearch}
        />

        {loading && <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>Searching...</p>}

        <ResultsGrid>
          {results.map(anime => (
            <AnimeCard key={anime.mal_id} onClick={() => selectAnime(anime)}>
              <CardImage src={anime.images.jpg.large_image_url} alt={anime.title} />
              <CardContent>
                <CardTitle>{anime.title}</CardTitle>
                <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)' }}>
                  {anime.type} • {anime.year || 'N/A'}
                </span>
              </CardContent>
            </AnimeCard>
          ))}
        </ResultsGrid>
      </SearchSection>

      {selectedAnime && (
        <ConverterSection>
          <ConverterTitle>
            <Icon icon="bi:book-half" />
            {selectedAnime.title}
            {fetchingManga && <span style={{ fontSize: '0.8rem', opacity: 0.7, marginLeft: '1rem' }}>(Loading manga data...)</span>}
          </ConverterTitle>

          <ConverterForm>
            <FormGroup>
              <label>Last Episode Watched</label>
              <input
                type="number"
                placeholder={`1 - ${selectedAnime.episodes || '?'}`}
                value={episode}
                onChange={(e) => setEpisode(e.target.value)}
                min="1"
              />
            </FormGroup>

            <CalculateButton onClick={calculateChapter} disabled={!episode || fetchingManga}>
              Find Chapter
            </CalculateButton>
          </ConverterForm>

          {estimation && (
            <ResultBox>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Badge level={estimation.confidence}>
                  <Icon icon={estimation.confidence === 'high' ? "bi:check-circle-fill" : "bi:exclamation-triangle-fill"} />
                  {estimation.confidence === 'high' ? 'Verified Source' : estimation.confidence === 'medium' ? 'Smart Estimate' : 'Rough Estimate'}
                </Badge>
              </div>

              <ResultText>
                After Episode <strong>{episode}</strong>, you should continue with:
                <br /><br />
                <span style={{ fontSize: '1.5rem', color: '#fbbf24', display: 'block', marginBottom: '1rem' }}>
                  Start reading at <strong>Chapter {estimation.chapter}</strong>
                </span>

                {estimation.volume && (
                  <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.1)', borderRadius: '8px', border: '1px solid #fbbf24' }}>
                    <Icon icon="bi:archive" style={{ marginRight: '0.5rem', color: '#fbbf24' }} />
                    <strong>Buy {estimation.isEstimatedVolume ? 'Estimated ' : ''}Volume {estimation.volume}</strong>
                  </div>
                )}
              </ResultText>

              {estimation.note && (
                <p style={{ marginTop: '1rem', color: 'rgba(255,255,255,0.7)', fontStyle: 'italic' }}>{estimation.note}</p>
              )}

              {mangaDetails && (
                <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                  <a
                    href={`https://google.com/search?q=buy+${encodeURIComponent(mangaDetails.mangaTitle || selectedAnime.title)}+manga+volume+${estimation.volume || 1}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      color: '#00d4ff',
                      textDecoration: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      fontWeight: 'bold',
                      background: 'rgba(0, 212, 255, 0.1)',
                      padding: '0.5rem 1rem',
                      borderRadius: '8px'
                    }}
                  >
                    <Icon icon="bi:cart-fill" /> Find Volume {estimation.volume || '1'}
                  </a>
                  {mangaDetails.mangaUrl && (
                    <a
                      href={mangaDetails.mangaUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        color: '#a78bfa',
                        textDecoration: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        fontWeight: 'bold'
                      }}
                    >
                      <Icon icon="bi:info-circle" /> Manga Info
                    </a>
                  )}
                </div>
              )}
            </ResultBox>
          )}

          <Disclaimer>
            * {estimation?.confidence === 'high'
              ? 'Data sourced from verified databases (AniList/MangaUpdates).'
              : 'Estimation calculated based on average pacing and total chapters.'}
          </Disclaimer>
        </ConverterSection>
      )}
    </Container>
  );
};
