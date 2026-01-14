import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import toast from 'react-hot-toast';

import { useAuth } from "../Context/authContext";
import { getTopAnime, getSeasonNow, getAnimeSearch } from "../../services/animeService";
import { getAniListAnime } from "../../services/aniListService";
import { getAnimeNews } from "../../services/newsService";
import { groupAnimeByBase } from "../../utils/animeGrouping";
import { HeroSection } from "./HeroSection";
import { NewsSection } from "./NewsSection";

import { AnimeCard } from "../Shared/AnimeCard";
import { Icon } from '@iconify/react';
import {
    Container,
    Section,
    SectionHeader,
    Title,
    ViewAllButton,
    Grid,
    LoadingContainer,
    PlaceholderPanel
} from './Home.styles';

export const Home = ({ addOrRemoveFromFavorites, favs }) => {
    const navigate = useNavigate();
    const { user } = useAuth();

    const [trendingAnime, setTrendingAnime] = useState([]);
    const [seasonalAnime, setSeasonalAnime] = useState([]);
    const [trendingMovies, setTrendingMovies] = useState([]);
    const [heroSlides, setHeroSlides] = useState([]);
    const [news, setNews] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchHomeData = async () => {
            setLoading(true); // Start LCP loading

            // Artificial delay helper - keep minimal to avoid rate limits if needed, 
            // but remove large blocking delays for UX.
            const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

            // Helper to fetch with error suppression
            const fetchSafe = async (fn, fallback = { data: [] }) => {
                try {
                    const res = await fn;
                    return res;
                } catch (error) {
                    console.warn("Partial fetch failed:", error);
                    return fallback;
                }
            };

            try {
                // --- PHASE 1: CRITICAL CONTENT (Hero & Trending) ---
                // We fetch this first and await it to show the initial screen.
                const trendingData = await fetchSafe(getTopAnime(1));

                const trendingRaw = trendingData.data || [];
                const showNSFW = user?.settings?.showNSFW || localStorage.getItem('nsfw_allowed') === 'true';
                const filterNSFW = (list) => showNSFW ? list : list.filter(a => a.rating !== "Rx - Hentai");

                const filteredTrending = filterNSFW(trendingRaw);
                const groupedTrending = groupAnimeByBase(filteredTrending);

                // Set Trending Data immediately
                setTrendingAnime(groupedTrending.series.slice(0, 12));
                setTrendingMovies(groupedTrending.movies.slice(0, 6));

                // Prepare Hero Slides (Trending + Genres placeholder)
                // We pick top trending to start with so we don't wait for Genre fetch to show Hero
                const initialSlidesRaw = filteredTrending.slice(0, 3).map(a => ({ ...a, genre: 'Trending' }));

                // Fetch banners for Hero (Parallel)
                // We do this BEFORE setLoading(false) so the Hero is ready
                const slidesWithBanners = await Promise.all(initialSlidesRaw.map(async (slide) => {
                    try {
                        // Quick check to avoid too many requests if title is missing
                        if (!slide.title) return slide;
                        const aniData = await getAniListAnime(slide.title_english || slide.title);
                        return {
                            ...slide,
                            bannerImage: aniData?.bannerImage || null
                        };
                    } catch (e) {
                        return slide;
                    }
                }));

                setHeroSlides(slidesWithBanners);
                setLoading(false); // <--- LCP UNBLOCKED HERE: User sees content!

                // --- PHASE 2: SECONDARY CONTENT (Seasonal, News) ---
                // Fetch in background. 
                // We add a small delay to be kind to the rate limiter since we just did a burst.
                await delay(600);

                const seasonalData = await fetchSafe(getSeasonNow(1));
                const filteredSeasonal = filterNSFW(seasonalData.data || []);
                setSeasonalAnime(groupAnimeByBase(filteredSeasonal).series.slice(0, 12));

                await delay(300);
                const newsData = await fetchSafe(getAnimeNews());
                setNews(newsData.data?.slice(0, 6) || []);

                // --- PHASE 3: TERTIARY CONTENT (Genres) ---
                // Lower priority
                await delay(300);

                // Fetch in parallel for speed
                // Fetch in parallel for speed (Prefetching logic preserved if intended, or just suppressing unused vars)
                await Promise.all([
                    fetchSafe(getAnimeSearch({ genres: 27, order_by: 'score', sort: 'desc', limit: 5 })),
                    fetchSafe(getAnimeSearch({ genres: 42, order_by: 'score', sort: 'desc', limit: 5 }))
                ]);

                // We can optionally use these to add more slides or sections later
                // For now, if we want to mix them into slides, we'd need to update slides state.
                // But changing the Hero Carousel after 3 seconds might be jarring.
                // Let's keep the Hero stable with just Trending for better UX/CLS.

            } catch (error) {
                console.error("Critical error loading homepage:", error);
                toast.error("Some content failed to load");
                setLoading(false); // Ensure we unblock on error
            }
        };

        fetchHomeData();
    }, [user]);

    const HandleHeartClick = (e, animeData) => {
        if (!user) {
            toast.error("Please log in to add to favorites");
            setTimeout(() => navigate("/login"), 1500);
            return;
        }
        // CRITICAL FIX: invoke the returned function with event (e)
        addOrRemoveFromFavorites(animeData)(e);
    };

    const renderAnimeCard = (anime) => {
        const animeData = {
            id: anime.mal_id,
            title: anime.title,
            img: anime.images.jpg.image_url,
            overview: anime.synopsis,
            vote_average: anime.score,
        };
        const isFav = favs.find((fav) => (fav.mal_id || fav.id) === anime.mal_id);

        return (
            <AnimeCard
                key={anime.mal_id}
                anime={anime}
                isFav={isFav}
                onHeartClick={(e) => HandleHeartClick(e, animeData)}
            />
        );
    };

    if (loading) {
        return (
            <LoadingContainer>
                <div className="spinner"></div>
                <style>{`
                    .spinner {
                        width: 50px;
                        height: 50px;
                        border: 5px solid rgba(255, 255, 255, 0.1);
                        border-top: 5px solid #fbbf24;
                        border-radius: 50%;
                        animation: spin 1s linear infinite;
                    }
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                `}</style>
            </LoadingContainer>
        );
    }

    return (
        <Container>
            <HeroSection slides={heroSlides} />

            <NewsSection news={news} />

            {/* Trending Section */}
            <Section>
                <SectionHeader>
                    <Title color="#ef4444">
                        <Icon icon="bi:fire" /> Trending Now
                    </Title>
                    <ViewAllButton to="/resultados?keyword=popular">
                        View All <Icon icon="bi:arrow-right" />
                    </ViewAllButton>
                </SectionHeader>
                <Grid>
                    {trendingAnime.map(renderAnimeCard)}
                </Grid>
            </Section>

            {/* Seasonal Section */}
            <Section>
                <SectionHeader>
                    <Title color="#10b981">
                        <Icon icon="bi:calendar3" /> This Season
                    </Title>
                    <ViewAllButton to="/resultados?keyword=seasonal">
                        View All <Icon icon="bi:arrow-right" />
                    </ViewAllButton>
                </SectionHeader>
                <Grid>
                    {seasonalAnime.map(renderAnimeCard)}
                </Grid>
            </Section>

            {/* Trending Movies */}
            {trendingMovies.length > 0 && (
                <Section>
                    <SectionHeader>
                        <Title color="#fbbf24">
                            <Icon icon="bi:film" /> Trending Movies
                        </Title>
                    </SectionHeader>
                    <Grid>
                        {trendingMovies.map(renderAnimeCard)}
                    </Grid>
                </Section>
            )}

            {/* My List Section */}
            {user && favs.length > 0 && (
                <Section>
                    <SectionHeader>
                        <Title color="#ff0055">
                            <Icon icon="bi:heart-fill" /> My List
                        </Title>
                        <ViewAllButton to="/favoritos">
                            View All ({favs.length}) <Icon icon="bi:arrow-right" />
                        </ViewAllButton>
                    </SectionHeader>
                    <Grid>
                        {favs.slice(0, 6).map((fav) => {
                            const anime = {
                                mal_id: fav.id,
                                title: fav.title,
                                images: { jpg: { image_url: fav.img, large_image_url: fav.img } },
                                synopsis: fav.overview,
                                score: fav.vote_average,
                                type: 'TV',
                                status: 'Finished Airing',
                                aired: {}
                            };
                            return renderAnimeCard(anime);
                        })}
                    </Grid>
                </Section>
            )}

            {/* Recently Viewed Placeholder */}
            {user && (
                <Section>
                    <SectionHeader>
                        <Title color="#3b82f6">
                            <Icon icon="bi:clock-history" /> Recently Viewed
                        </Title>
                        <ViewAllButton to="/history">
                            View All <Icon icon="bi:arrow-right" />
                        </ViewAllButton>
                    </SectionHeader>
                    <PlaceholderPanel>
                        <Icon icon="bi:clock-history" />
                        <p>Your watch history will appear here</p>
                    </PlaceholderPanel>
                </Section>
            )}
        </Container>
    );
};
