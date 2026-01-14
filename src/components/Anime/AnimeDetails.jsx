import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from 'react-hot-toast';
import { useAuth } from "../Context/authContext";
import { getAnimeDetails, getAnimeCharacters, getAnimeVideos, getAnimeRelations, getAnimeSearch, getAnimeStaff } from "../../services/animeService";
import { getAniListAnime } from "../../services/aniListService";
import { extractBaseTitle, groupAnimeByBase } from "../../utils/animeGrouping";
import { Reviews } from "../Shared/Reviews";
import { EpisodeList } from "../Shared/EpisodeList";
import { StreamingBadges } from "../Shared/StreamingBadges";
import { VoiceActors } from "./VoiceActors";
import { MangaGuide } from "./MangaGuide";
import { Icon } from '@iconify/react';
import {
    HeroSection,
    HeroContent,
    PosterImage,
    InfoColumn,
    Title,
    Subtitle,
    MetaBadges,
    Badge,
    Synopsis,
    ContentContainer,
    Section,
    SectionTitle,
    AlertBox,
    Grid,
    CharacterCard,
    VideoWrapper,
    RelationsList,
    RelationItem,
    RelationLink
} from './AnimeDetails.styles';

export const AnimeDetails = () => {
    let query = new URLSearchParams(window.location.search);
    let animeID = query.get("id") || query.get("MovieID");

    const navigate = useNavigate();
    const { user } = useAuth();

    const [details, setDetails] = useState(null);
    const [aniListDetails, setAniListDetails] = useState(null);
    const [characters, setCharacters] = useState([]);
    const [videos, setVideos] = useState([]);
    const [relations, setRelations] = useState([]);
    const [staff, setStaff] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showNSFWWarning, setShowNSFWWarning] = useState(false);
    const [contentRevealed, setContentRevealed] = useState(false);

    const [franchiseSeasons, setFranchiseSeasons] = useState([]);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                // 1. Fetch Jikan Data (Primary)
                const animeData = await getAnimeDetails(animeID);
                setDetails(animeData);

                // 2. Fetch AniList Data (Secondary)
                const searchTitle = animeData.title_english || animeData.title;
                if (searchTitle) {
                    getAniListAnime(searchTitle).then(data => {
                        if (data) setAniListDetails(data);
                    });
                }

                // 3. Fetch Franchise Seasons (Search by base title)
                const baseTitle = extractBaseTitle(animeData.title);
                if (baseTitle) {
                    getAnimeSearch({ q: baseTitle, limit: 25 }).then(searchData => {
                        if (searchData.data) {
                            const grouped = groupAnimeByBase(searchData.data);
                            const match = grouped.series.find(g =>
                                g.mal_id === animeData.mal_id ||
                                g._allSeasons.some(s => s.mal_id === animeData.mal_id)
                            );

                            if (match && match._allSeasons) {
                                const sorted = match._allSeasons.sort((a, b) => {
                                    const dateA = a.aired?.from ? new Date(a.aired.from) : new Date(0);
                                    const dateB = b.aired?.from ? new Date(b.aired.from) : new Date(0);
                                    return dateA - dateB;
                                });
                                setFranchiseSeasons(sorted);
                            }
                        }
                    });
                }

                const [chars, vids, rels, staffData] = await Promise.all([
                    getAnimeCharacters(animeID),
                    getAnimeVideos(animeID),
                    getAnimeRelations(animeID),
                    getAnimeStaff(animeID)
                ]);

                const sortedChars = chars.sort((a, b) => {
                    const roleA = a.role || '';
                    const roleB = b.role || '';
                    if (roleA === 'Main' && roleB !== 'Main') return -1;
                    if (roleA !== 'Main' && roleB === 'Main') return 1;
                    return 0;
                });
                setCharacters(sortedChars);
                setVideos(vids.promo || []);
                setRelations(rels);
                setStaff(staffData);

            } catch (error) {
                console.error("Error fetching details:", error);
                toast.error("Error loading anime details");
            } finally {
                setLoading(false);
            }
        };
        if (animeID) {
            fetchData();
        }
    }, [animeID, user]);

    // Determine if franchise is ongoing
    const isFranchiseOngoing = () => {
        // Check franchise seasons
        if (franchiseSeasons.length > 0) {
            const hasUpcoming = franchiseSeasons.some(s => s.status === 'Not yet aired' || s.status === 'Currently Airing');
            if (hasUpcoming) return true;
        }
        // Check relations
        if (relations.length > 0) {
            const hasSequel = relations.some(r => r.relation === 'Sequel');
            if (hasSequel) return true;
        }
        return false;
    };

    const statusDisplay = isFranchiseOngoing() && details?.status === 'Finished Airing' ? 'Franchise Ongoing' : details?.status;

    const handleRevealContent = () => {
        if (!user) {
            toast.error("You must be logged in and over 18 to view this content.");
            setTimeout(() => navigate("/login"), 1500);
        } else if (!user.settings?.showNSFW) {
            toast.error("You have not enabled NSFW content in your settings.");
            navigate("/");
        } else {
            setContentRevealed(true);
            setShowNSFWWarning(false);
        }
    };



    if (loading) return (
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', color: '#00d4ff' }}>
            <img src="https://media.tenor.com/_BiwWBWhYucAAAAi/what-loading.gif" alt="Loading..." />
            <h2>Loading Anime...</h2>
        </div>
    );

    if (!details) return <div>Anime not found</div>;

    if (showNSFWWarning && !contentRevealed) {
        return (
            <ContentContainer style={{ marginTop: '100px', textAlign: 'center' }}>
                <AlertBox style={{ flexDirection: 'column', background: 'rgba(239, 68, 68, 0.1)', borderColor: '#ef4444' }}>
                    <Icon icon="bi:exclamation-triangle-fill" style={{ color: '#ef4444', fontSize: '3rem' }} />
                    <h3>NSFW Content Warning</h3>
                    <p>This anime contains explicit content.</p>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <button
                            onClick={handleRevealContent}
                            style={{ padding: '0.5rem 1rem', background: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                        >
                            I am over 18 and want to view this content
                        </button>
                        <button
                            onClick={() => navigate("/")}
                            style={{ padding: '0.5rem 1rem', background: '#4b5563', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                        >
                            Go Back
                        </button>
                    </div>
                </AlertBox>
            </ContentContainer>
        );
    }

    const relatedSeasons = relations.filter(r =>
        ['Sequel', 'Prequel', 'Parent story', 'Side story', 'Summary', 'Alternative version'].includes(r.relation)
    );

    // Use AniList banner if available, otherwise Jikan large image
    const bannerImage = aniListDetails?.bannerImage || details.images.jpg.large_image_url;

    return (
        <>
            <HeroSection style={{ backgroundImage: `url(${bannerImage})` }}>
                <HeroContent>
                    <PosterImage src={details.images.jpg.large_image_url} alt={details.title} />
                    <InfoColumn>
                        <Title>{details.title}</Title>
                        <Subtitle>{details.title_english || details.title_japanese}</Subtitle>

                        <MetaBadges>
                            <Badge>{details.type}</Badge>
                            <Badge>{details.year || (details.aired?.from ? new Date(details.aired.from).getFullYear() : 'N/A')}</Badge>
                            <Badge style={{
                                background: statusDisplay === 'Franchise Ongoing' ? 'rgba(16, 185, 129, 0.2)' :
                                    details.status === 'Currently Airing' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                                color: statusDisplay === 'Franchise Ongoing' ? '#10b981' :
                                    details.status === 'Currently Airing' ? '#10b981' : '#fff'
                            }}>
                                {statusDisplay}
                            </Badge>
                            <Badge>{details.duration}</Badge>
                            <Badge style={{ background: '#ef4444' }}>
                                {details.rating ? details.rating.split(' - ')[0] : 'N/A'}
                            </Badge>
                        </MetaBadges>

                        <Synopsis>
                            {details.synopsis}
                        </Synopsis>

                        {/* Studio Info */}
                        {details.studios?.length > 0 && (
                            <div style={{ marginTop: '1rem', color: 'rgba(255,255,255,0.7)', fontSize: '0.95rem' }}>
                                <Icon icon="bi:building" style={{ color: '#00d4ff', marginRight: '0.5rem' }} />
                                Studio: <strong style={{ color: 'white' }}>
                                    {details.studios.map(s => s.name).join(', ')}
                                </strong>
                            </div>
                        )}

                        {/* Author Info */}
                        {staff.length > 0 && (
                            <div style={{ marginTop: '0.5rem', color: 'rgba(255,255,255,0.7)', fontSize: '0.95rem' }}>
                                <Icon icon="bi:pen-fill" style={{ color: '#fbbf24', marginRight: '0.5rem' }} />
                                Created by: <strong style={{ color: 'white' }}>
                                    {staff.find(p => p.positions.includes("Original Creator") || p.positions.includes("Story & Art"))?.person.name || "Unknown"}
                                </strong>
                            </div>
                        )}

                        {/* Streaming Platforms / Licensors */}
                        {details.streaming?.length > 0 && (
                            <div style={{ marginTop: '1rem' }}>
                                <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                                    <Icon icon="bi:tv" style={{ marginRight: '0.5rem' }} />
                                    Where to Watch:
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                    {details.streaming.map((stream, idx) => (
                                        <a
                                            key={idx}
                                            href={stream.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            style={{
                                                padding: '0.25rem 0.75rem',
                                                background: 'rgba(255,255,255,0.1)',
                                                borderRadius: '4px',
                                                color: '#00d4ff',
                                                textDecoration: 'none',
                                                fontSize: '0.85rem',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.25rem'
                                            }}
                                        >
                                            <Icon icon="bi:play-circle" /> {stream.name}
                                        </a>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                            <StreamingBadges title={details.title} />
                        </div>
                    </InfoColumn>
                </HeroContent>
            </HeroSection >

            <ContentContainer>
                <Grid>
                    <div style={{ gridColumn: 'span 8' }}>
                        {/* Episode List */}
                        <EpisodeList
                            animeId={details.mal_id}
                            themes={details.theme}
                            relations={relations}
                            details={details}
                            aniListDetails={aniListDetails}
                            franchiseSeasons={franchiseSeasons}
                        />

                        {/* Reviews */}
                        <Reviews animeId={details.mal_id} />
                    </div>

                    <div style={{ gridColumn: 'span 4' }}>
                        {/* Characters */}
                        <Section>
                            <SectionTitle>
                                <Icon icon="bi:people-fill" style={{ color: '#a78bfa' }} />
                                Characters
                            </SectionTitle>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: '1rem' }}>
                                {characters.slice(0, 12).map(char => (
                                    <CharacterCard key={char.character.mal_id}>
                                        <img src={char.character.images.jpg.image_url} alt={char.character.name} />
                                        <p>{char.character.name}</p>
                                    </CharacterCard>
                                ))}
                            </div>
                        </Section>

                        {/* Voice Actors */}
                        <VoiceActors staff={staff} characters={characters} />

                        {/* Manga Guide - Where to Continue Reading */}
                        <MangaGuide animeId={details.mal_id} animeTitle={extractBaseTitle(details.title)} />

                        {/* Trailer */}
                        {videos.length > 0 && (
                            <Section>
                                <SectionTitle>
                                    <Icon icon="bi:film" style={{ color: '#fbbf24' }} />
                                    Trailer
                                </SectionTitle>
                                <VideoWrapper>
                                    <iframe
                                        src={videos[0].trailer.embed_url}
                                        title="Trailer"
                                        allowFullScreen
                                    />
                                </VideoWrapper>
                            </Section>
                        )}

                        {relatedSeasons.length > 0 && (
                            <Section>
                                <SectionTitle>
                                    <Icon icon="bi:diagram-3-fill" style={{ color: '#3b82f6' }} />
                                    Related
                                </SectionTitle>
                                <RelationsList>
                                    {relatedSeasons.map(rel => (
                                        <RelationItem key={rel.entry[0].mal_id}>
                                            <span style={{ color: '#9ca3af', fontSize: '0.9rem' }}>{rel.relation}:</span>
                                            <RelationLink to={`/detalle?id=${rel.entry[0].mal_id}`}>
                                                {rel.entry[0].name}
                                            </RelationLink>
                                        </RelationItem>
                                    ))}
                                </RelationsList>
                            </Section>
                        )}
                    </div>
                </Grid>
            </ContentContainer>
        </>
    );
};
