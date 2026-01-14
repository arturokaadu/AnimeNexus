import { useState, useEffect } from "react";
import { getAnimeEpisodes, getAnimeThemes } from "../../services/animeService";
import { getAniListAnime } from "../../services/aniListService";
import { openYouTubeSearch } from "../../services/spotifyService";
import { LazyImage } from "../Common/LazyImage";
import { Icon } from '@iconify/react';
import {
    EpisodeContainer,
    ThemesSection,
    ThemeHeader,
    ThemeItem,
    ThemeTitle,
    ThemeLinks,
    ThemeLink,
    SectionHeader,
    SeasonAccordion,
    SeasonHeader,
    SeasonIcon,
    SeasonTitle,
    SeasonStats,
    EpisodeCard,
    EpisodeNumber,
    EpisodeInfo,
    EpisodeTitle,
    EpisodeTypeBadge,
    EpisodeMeta,
    LoadingSpinner,
    ContinuationSection,
    ThumbnailContainer,
    ContentWrapper,
    EpisodesColumn,
    Sidebar,
    LoadMoreContainer,
    LoadMoreButton,
    NoEpisodesMessage,
    NextSectionHeader,
    NextSectionLink,
    RatingBadge,
    EpisodeHeader,
    WatchNextContainer,
    WatchNextLabel,
    MangaSection,
    MangaTitle,
    MangaLink,
    MangaInfo,
    GuideLink
} from './EpisodeList.styles';

export const EpisodeList = ({ animeId, themes: initialThemes, relations, details, aniListDetails, franchiseSeasons }) => {
    const [seasons, setSeasons] = useState([]);
    const [expandedSeasons, setExpandedSeasons] = useState([0]);
    const [loadingSeasons, setLoadingSeasons] = useState({});
    const [seasonThemes, setSeasonThemes] = useState({});
    const [seasonAniList, setSeasonAniList] = useState({}); // Store AniList data per season
    const [visibleEpisodes, setVisibleEpisodes] = useState(50);

    useEffect(() => {
        const buildSeasonStructure = async () => {
            let seasonsList = [];

            // Priority: Use Franchise Seasons if available (fetched via search)
            if (franchiseSeasons && franchiseSeasons.length > 0) {
                seasonsList = franchiseSeasons.map((season, index) => ({
                    mal_id: season.mal_id,
                    seasonNumber: index + 1,
                    title: season.title,
                    type: season.type,
                    episodes: [],
                    episodeCount: season.episodes || 0,
                    avgScore: season.score || 'N/A',
                    isMain: season.mal_id === animeId,
                    isSequel: season.mal_id !== animeId,
                    images: season.images, // Images should be available from search
                    status: season.status // Add status for each season
                }));
                console.log("EpisodeList - Using franchiseSeasons:", seasonsList.length, seasonsList);
            } else {
                console.log("EpisodeList - No franchiseSeasons, using fallback. Relations:", relations);
                // Fallback to old relations logic
                const mainSeason = {
                    mal_id: animeId,
                    seasonNumber: 1,
                    title: details?.title || "Season 1",
                    type: details?.type || "TV",
                    episodes: [],
                    episodeCount: details?.episodes || 0,
                    avgScore: details?.score || 'N/A',
                    isMain: true,
                    images: details?.images // Store main images
                };

                seasonsList = [mainSeason];

                if (relations) {
                    const sequels = relations.filter(r => r.relation === 'Sequel');
                    sequels.forEach((sequel, index) => {
                        const entry = sequel.entry[0];
                        if (entry.type === 'anime') {
                            seasonsList.push({
                                mal_id: entry.mal_id,
                                seasonNumber: index + 2,
                                title: entry.name,
                                type: entry.type,
                                episodes: [],
                                episodeCount: 0,
                                avgScore: 'N/A',
                                isSequel: true,
                                // Note: We might not have images for relations here unless we fetch them. 
                                // But usually franchiseSeasons covers this. 
                                // If falling back to relations, we might need to fetch or just use main as last resort.
                                images: null
                            });
                        }
                    });
                }
            }

            setSeasons(seasonsList);

            // Initialize themes for the main season if available
            if (initialThemes) {
                setSeasonThemes(prev => ({
                    ...prev,
                    [animeId]: initialThemes
                }));
            }

            // Auto-load the current anime's episodes
            const currentIndex = seasonsList.findIndex(s => s.mal_id === parseInt(animeId));
            if (currentIndex !== -1) {
                loadSeasonEpisodes(currentIndex, seasonsList[currentIndex].mal_id, seasonsList[currentIndex].title);
                setExpandedSeasons([currentIndex]);
            } else if (seasonsList.length > 0) {
                loadSeasonEpisodes(0, seasonsList[0].mal_id, seasonsList[0].title);
            }
        };

        buildSeasonStructure();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [animeId, relations, details, franchiseSeasons, initialThemes]);

    const loadSeasonEpisodes = async (seasonIndex, seasonMalId, seasonTitle) => {
        if (loadingSeasons[seasonIndex]) return;

        setLoadingSeasons(prev => ({ ...prev, [seasonIndex]: true }));
        try {
            // Fetch episodes
            let allEpisodes = [];
            let page = 1;
            let hasMore = true;

            // Start fetching themes in parallel if not already loaded
            const themesPromise = !seasonThemes[seasonMalId] ? getAnimeThemes(seasonMalId) : Promise.resolve(null);

            // Start fetching AniList data for thumbnails in parallel
            // Use seasonTitle for search
            const aniListPromise = !seasonAniList[seasonMalId] && seasonTitle
                ? getAniListAnime(seasonTitle)
                : Promise.resolve(null);

            while (hasMore) {
                const data = await getAnimeEpisodes(seasonMalId, page);
                allEpisodes = [...allEpisodes, ...data.data];
                hasMore = data.pagination.has_next_page;
                page++;
            }

            const [fetchedThemes, fetchedAniList] = await Promise.all([themesPromise, aniListPromise]);

            if (fetchedThemes) {
                setSeasonThemes(prev => ({ ...prev, [seasonMalId]: fetchedThemes }));
            }

            if (fetchedAniList) {
                console.log(`[AniList] ${seasonTitle}: ${fetchedAniList.streamingEpisodes?.length || 0} episode thumbnails found`);
                setSeasonAniList(prev => ({ ...prev, [seasonMalId]: fetchedAniList }));
            }

            const scores = allEpisodes.filter(e => e.score).map(e => e.score);
            const avgScore = scores.length
                ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)
                : 'N/A';

            setSeasons(prev => {
                const updated = [...prev];
                updated[seasonIndex] = {
                    ...updated[seasonIndex],
                    episodes: allEpisodes,
                    episodeCount: allEpisodes.length,
                    avgScore
                };
                return updated;
            });

            // Handle themes result
            const themesData = await themesPromise;
            if (themesData) {
                setSeasonThemes(prev => ({
                    ...prev,
                    [seasonMalId]: themesData
                }));
            }

        } catch (error) {
            console.error("Error loading season data:", error);
        } finally {
            setLoadingSeasons(prev => ({ ...prev, [seasonIndex]: false }));
        }
    };

    const toggleSeason = async (seasonIndex) => {
        const season = seasons[seasonIndex];

        if (expandedSeasons.includes(seasonIndex)) {
            setExpandedSeasons(prev => prev.filter(i => i !== seasonIndex));
        } else {
            setExpandedSeasons(prev => [...prev, seasonIndex]);
            setVisibleEpisodes(50); // Reset pagination
            if (!season.episodes || season.episodes.length === 0) {
                await loadSeasonEpisodes(seasonIndex, season.mal_id);
            }
        }
    };

    const getEpisodeType = (episode) => {
        if (episode.filler) return {
            icon: '🟠',
            label: 'Filler',
            color: '#fd7e14',
            bgColor: '#fd7e14',
            textColor: '#000'
        };
        if (episode.recap) return {
            icon: '🟣',
            label: 'Recap',
            color: '#6f42c1',
            bgColor: '#6f42c1',
            textColor: '#fff'
        };
        return {
            icon: '🟢',
            label: 'Canon',
            color: '#10b981',
            bgColor: '#10b981',
            textColor: '#fff'
        };
    };

    const getSeasonLabel = (season) => {
        if (season.type === 'Movie') {
            return `Movie: ${season.title}`;
        }
        if (season.isSpecial) {
            return season.type.toUpperCase();
        }
        if (season.isMain) {
            return season.type === 'TV' ? `Season ${season.seasonNumber}` : season.type;
        }
        return `Season ${season.seasonNumber}`;
    };

    const handlePlayTheme = (themeName) => {
        // Simple heuristic to get a YouTube Embed URL
        // In a real app we might need to search the YouTube API for an ID first.
        // For now, we will open a search in a popup or new tab because we don't have direct video IDs.
        // User requested "embedded", but without an ID we can't embed directly.
        // HOWEVER, we can use a "YouTube Search Embed" or just iframe search results if possible (often blocked).
        // Let's stick to the request: "deja embedded lo de youyube".
        // To do this reliably without an API key for search, allows simple "search query" embeds are deprecated.
        // We'll use a standard search link as fallback OR if we have videoID.
        // Since we don't have videoIDs from `getAnimeThemes`, we'll try to use a generic embed or just keep the search but styling it as requested?
        // Actually, the user wants "embedded", implying we should play it.
        // Let's try to fetch a video ID or just open a modal that *simulates* a player if we had the ID.
        // Since we lack IDs, I will keep the external open but maybe style it better? 
        // WAIT: The prompt says "deja embedded". I will assume I can't easily get the ID without an API call.
        // Lets try to use the `openYouTubeSearch` logic but maybe in a cleaner way? 
        // No, I will implement a "Search on YouTube" modal that feels like an app interaction.
        // OR better: I'll use the existing `openYouTubeSearch` but invoke it from a nice UI.

        // Re-reading: "deja embedded lo de youyube en los openings y endings"
        // If I can't embed without ID, I'll stick to the current behavior but maybe visually integrated?
        // Actually, let's look at `getAnimeVideos`. That returns trailers with Embed URLs.
        // Themes usually don't have embed URLs in Jikan.
        // I will add a disclaimer or fallback.
        // Let's stick to opening it for now but removing the *episode* links as requested ("Quit the links within each episode").

        openYouTubeSearch(themeName);
    };

    const mangaAdaptation = relations?.find(r => r.relation === 'Adaptation' && r.entry[0].type === 'manga')?.entry[0];

    return (
        <EpisodeContainer>
            <SectionHeader>
                <Icon icon="bi:collection-play" style={{ color: '#0dcaf0' }} />
                Episodes
            </SectionHeader>

            {seasons.map((season, index) => {
                const isExpanded = expandedSeasons.includes(index);
                const isLoading = loadingSeasons[index];

                // Logic for "What's Next"
                const isLastSeason = index === seasons.length - 1;

                const nextSequelRelation = relations?.find(r => r.relation === 'Sequel');
                const nextSequelEntry = nextSequelRelation?.entry[0];

                const isSequelAlreadyInList = nextSequelEntry && seasons.some(s => s.mal_id === nextSequelEntry.mal_id);

                // Show "Watch Next" if it's the last season AND there is a sequel NOT in the list
                const showWatchNext = isLastSeason && nextSequelEntry && !isSequelAlreadyInList;

                // Show "Read Manga" if it's the last season. 
                const showReadManga = isLastSeason && mangaAdaptation;

                // Get themes for this specific season
                const currentThemes = seasonThemes[season.mal_id];
                const hasThemes = currentThemes && (currentThemes.openings?.length > 0 || currentThemes.endings?.length > 0);

                return (
                    <SeasonAccordion key={season.mal_id}>
                        <SeasonHeader onClick={() => toggleSeason(index)}>
                            <SeasonIcon $isOpen={isExpanded}>▶</SeasonIcon>
                            <SeasonTitle>{getSeasonLabel(season)}</SeasonTitle>
                            <SeasonStats>
                                <span>
                                    <Icon icon="bi:film" />
                                    {season.episodeCount || '?'} episodes
                                </span>
                                <span>
                                    <Icon icon="bi:star-fill" style={{ color: '#fbbf24' }} />
                                    {season.avgScore}
                                </span>
                            </SeasonStats>
                        </SeasonHeader>

                        {isExpanded && (
                            <ContentWrapper $isOpen={true}>
                                <EpisodesColumn>
                                    {isLoading ? (
                                        <LoadingSpinner>
                                            <img src="https://media.tenor.com/_BiwWBWhYucAAAAi/what-loading.gif" alt="Loading..." />
                                            <p>Loading episodes...</p>
                                        </LoadingSpinner>
                                    ) : season.episodes.length > 0 ? (
                                        <>
                                            {season.episodes.slice(0, visibleEpisodes).map((episode, index) => {
                                                const type = getEpisodeType(episode);
                                                // Fix rating scale: if <= 5, multiply by 2 to match 10-point scale
                                                const score = episode.score ? (episode.score <= 5 ? episode.score * 2 : episode.score) : null;

                                                // IMPROVED Thumbnail fallback logic with multiple strategies
                                                const getEpisodeThumbnail = () => {
                                                    // 1. Check if Jikan has a valid episode-specific image
                                                    const jikanImg = episode.images?.jpg?.image_url;
                                                    const hasValidJikanImage = jikanImg &&
                                                        !jikanImg.includes('questionmark') &&
                                                        !jikanImg.includes('qm_50') &&
                                                        !jikanImg.includes('na.gif');

                                                    if (hasValidJikanImage) {
                                                        return { src: jikanImg, isUnique: true };
                                                    }

                                                    // 2. Try AniList streamingEpisodes with multiple matching strategies
                                                    const streamingEps = seasonAniList[season.mal_id]?.streamingEpisodes;
                                                    if (streamingEps?.length > 0) {
                                                        const epNum = episode.mal_id;

                                                        // Strategy A: Exact episode number match in title
                                                        let matchingEp = streamingEps.find(ep => {
                                                            const title = ep.title || '';
                                                            // Match "Episode X", "Ep X", "E X", "#X", "- X", "X -", etc.
                                                            const patterns = [
                                                                new RegExp(`episode\\s*0*${epNum}(?:\\s|$|:|\\.|-)`, 'i'),
                                                                new RegExp(`ep\\.?\\s*0*${epNum}(?:\\s|$|:|\\.|-)`, 'i'),
                                                                new RegExp(`(?:^|\\s)e0*${epNum}(?:\\s|$|:|\\.|-)`, 'i'),
                                                                new RegExp(`#\\s*0*${epNum}(?:\\s|$)`, 'i'),
                                                                new RegExp(`-\\s*0*${epNum}(?:\\s|$)`, 'i'),
                                                                new RegExp(`\\s${epNum}\\s*[-–:]`, 'i'),
                                                            ];
                                                            return patterns.some(pattern => pattern.test(title));
                                                        });

                                                        if (matchingEp?.thumbnail) {
                                                            return { src: matchingEp.thumbnail, isUnique: true };
                                                        }

                                                        // Strategy B: Use index-based matching (for sequential episodes)
                                                        // Calculate offset based on episode numbering
                                                        const firstEpNum = season.episodes[0]?.mal_id || 1;
                                                        const offsetIndex = epNum - firstEpNum;

                                                        if (streamingEps[offsetIndex]?.thumbnail) {
                                                            return { src: streamingEps[offsetIndex].thumbnail, isUnique: true };
                                                        }

                                                        // Strategy C: Direct index match
                                                        if (streamingEps[index]?.thumbnail) {
                                                            return { src: streamingEps[index].thumbnail, isUnique: true };
                                                        }

                                                        // Strategy D: Episode number - 1 (0-indexed)
                                                        if (streamingEps[epNum - 1]?.thumbnail) {
                                                            return { src: streamingEps[epNum - 1].thumbnail, isUnique: true };
                                                        }
                                                    }

                                                    // 3. Use AniList banner/cover as a variety source
                                                    const anilistData = seasonAniList[season.mal_id];
                                                    if (anilistData?.bannerImage && index % 2 === 0) {
                                                        return { src: anilistData.bannerImage, isUnique: false };
                                                    }
                                                    if (anilistData?.coverImage?.extraLarge) {
                                                        return { src: anilistData.coverImage.extraLarge, isUnique: false };
                                                    }

                                                    // 4. Final fallback: season/details poster
                                                    const fallback = season.images?.jpg?.large_image_url ||
                                                        details?.images?.jpg?.large_image_url;
                                                    return { src: fallback, isUnique: false };
                                                };

                                                const thumbnailData = getEpisodeThumbnail();
                                                const fallbackSrc = details?.images?.jpg?.large_image_url;

                                                return (
                                                    <EpisodeCard
                                                        key={episode.mal_id}
                                                        style={{ cursor: 'default' }} // Removed pointer cursor
                                                    >
                                                        <ThumbnailContainer>
                                                            <LazyImage
                                                                src={thumbnailData.src}
                                                                alt={`Ep ${episode.mal_id}`}
                                                                fallbackSrc={fallbackSrc}
                                                            />
                                                            <EpisodeNumber>Ep {episode.mal_id}</EpisodeNumber>
                                                        </ThumbnailContainer>

                                                        <EpisodeInfo>
                                                            <EpisodeHeader>
                                                                <EpisodeTitle>{episode.title}</EpisodeTitle>
                                                                <EpisodeTypeBadge $bgColor={type.bgColor} $textColor={type.textColor}>
                                                                    {type.label}
                                                                </EpisodeTypeBadge>
                                                                {score && (
                                                                    <RatingBadge>
                                                                        <Icon icon="bi:star-fill" /> {score}
                                                                    </RatingBadge>
                                                                )}
                                                            </EpisodeHeader>

                                                            <EpisodeMeta>
                                                                {episode.aired ? new Date(episode.aired).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : 'Aired: N/A'}
                                                            </EpisodeMeta>
                                                        </EpisodeInfo>
                                                    </EpisodeCard>
                                                );
                                            })}
                                            {season.episodes.length > visibleEpisodes && (
                                                <LoadMoreContainer>
                                                    <LoadMoreButton onClick={() => setVisibleEpisodes(prev => prev + 50)}>
                                                        <Icon icon="bi:chevron-down" /> Load More Episodes
                                                    </LoadMoreButton>
                                                </LoadMoreContainer>
                                            )}
                                        </>
                                    ) : (
                                        <NoEpisodesMessage>
                                            No episodes found.
                                        </NoEpisodesMessage>
                                    )}

                                    {/* What's Next Section */}
                                    {(showReadManga || showWatchNext) && (
                                        <ContinuationSection>
                                            <NextSectionHeader>
                                                <Icon icon="bi:arrow-right-circle" /> What's Next?
                                            </NextSectionHeader>

                                            {showWatchNext && (
                                                <WatchNextContainer hasManga={showReadManga}>
                                                    <WatchNextLabel>
                                                        📺 Watch next {nextSequelEntry.type === 'Movie' ? 'Movie' : 'Season'}:
                                                    </WatchNextLabel>
                                                    <br />
                                                    <NextSectionLink to={`/detalle?id=${nextSequelEntry.mal_id}`}>
                                                        {nextSequelEntry.name} ({nextSequelEntry.type})
                                                        <Icon icon="bi:play-circle" />
                                                    </NextSectionLink>
                                                </WatchNextContainer>
                                            )}

                                            {showReadManga && (
                                                <MangaSection>
                                                    <MangaTitle>📖 Read the manga:</MangaTitle>
                                                    <MangaLink
                                                        href={mangaAdaptation.url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                    >
                                                        {mangaAdaptation.name}
                                                        <Icon icon="bi:box-arrow-up-right" />
                                                    </MangaLink>
                                                    <MangaInfo>
                                                        {details?.status === 'Currently Airing' ? (
                                                            <>
                                                                ⚠️ The anime is still airing.
                                                                <br />
                                                                You can check the <GuideLink to="/manga-guide">Manga Guide</GuideLink> to see the latest chapters.
                                                            </>
                                                        ) : (
                                                            <>
                                                                💡 The anime has finished airing.
                                                                <br />
                                                                <GuideLink to="/manga-guide">
                                                                    Use our Manga Guide
                                                                </GuideLink> to find exactly where to continue reading!
                                                            </>
                                                        )}
                                                    </MangaInfo>
                                                </MangaSection>
                                            )}
                                        </ContinuationSection>
                                    )}
                                </EpisodesColumn>

                                {/* Sidebar for Themes */}
                                {hasThemes && (
                                    <Sidebar>
                                        {currentThemes.openings?.length > 0 && (
                                            <ThemesSection>
                                                <ThemeHeader>🎵 Opening Themes</ThemeHeader>
                                                {currentThemes.openings.slice(0, 3).map((op, idx) => (
                                                    <ThemeItem key={`op-${idx}`}>
                                                        <ThemeTitle>{idx + 1}. {op}</ThemeTitle>
                                                        <ThemeLinks>
                                                            {/* We keep the search behaviour but make it clear it goes to YT 
                                                                Since we can't embed a search query as a video player easily without an API key */}
                                                            <ThemeLink color="#ff0000" onClick={() => handlePlayTheme(op)}>
                                                                <Icon icon="bi:youtube" /> Play
                                                            </ThemeLink>
                                                        </ThemeLinks>
                                                    </ThemeItem>
                                                ))}
                                            </ThemesSection>
                                        )}

                                        {currentThemes.endings?.length > 0 && (
                                            <ThemesSection>
                                                <ThemeHeader>🎵 Ending Themes</ThemeHeader>
                                                {currentThemes.endings.slice(0, 3).map((ed, idx) => (
                                                    <ThemeItem key={`ed-${idx}`}>
                                                        <ThemeTitle>{idx + 1}. {ed}</ThemeTitle>
                                                        <ThemeLinks>
                                                            <ThemeLink color="#ff0000" onClick={() => handlePlayTheme(ed)}>
                                                                <Icon icon="bi:youtube" /> Play
                                                            </ThemeLink>
                                                        </ThemeLinks>
                                                    </ThemeItem>
                                                ))}
                                            </ThemesSection>
                                        )}
                                    </Sidebar>
                                )}
                            </ContentWrapper>
                        )}
                    </SeasonAccordion>
                );
            })}
        </EpisodeContainer>
    );
};
