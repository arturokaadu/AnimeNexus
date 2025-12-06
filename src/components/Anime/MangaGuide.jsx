import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { Icon } from '@iconify/react';
import { getMangaContinuationWithFallback } from '../../services/mangaService';

const Container = styled.div`
    margin-top: 2rem;
    background: linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(59, 130, 246, 0.1));
    border-radius: 12px;
    overflow: hidden;
    border: 1px solid rgba(139, 92, 246, 0.3);
`;

const Header = styled.div`
    padding: 1rem 1.5rem;
    background: rgba(139, 92, 246, 0.2);
    display: flex;
    justify-content: space-between;
    align-items: center;
    cursor: pointer;
    transition: background 0.2s;

    &:hover {
        background: rgba(139, 92, 246, 0.3);
    }
`;

const Title = styled.h3`
    margin: 0;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 1.1rem;
    color: #fff;
`;

const Content = styled.div`
    padding: 1.5rem;
    display: ${({ $expanded }) => $expanded ? 'block' : 'none'};
`;

const InfoCard = styled.div`
    background: rgba(255, 255, 255, 0.05);
    border-radius: 8px;
    padding: 1.5rem;
    display: flex;
    gap: 1.5rem;
    flex-wrap: wrap;

    @media (max-width: 600px) {
        flex-direction: column;
    }
`;

const ContinuationBox = styled.div`
    flex: 1;
    min-width: 200px;
    text-align: center;
    padding: 1rem;
    background: linear-gradient(135deg, rgba(139, 92, 246, 0.3), rgba(59, 130, 246, 0.3));
    border-radius: 8px;
`;

const ChapterNumber = styled.div`
    font-size: 3rem;
    font-weight: bold;
    color: #a78bfa;
    line-height: 1;
`;

const ChapterLabel = styled.div`
    font-size: 0.9rem;
    color: rgba(255, 255, 255, 0.7);
    margin-top: 0.5rem;
`;

const VolumeInfo = styled.div`
    font-size: 0.85rem;
    color: rgba(255, 255, 255, 0.5);
    margin-top: 0.25rem;
`;

const MangaInfo = styled.div`
    flex: 2;
    min-width: 250px;
`;

const MangaTitle = styled.h4`
    margin: 0 0 0.5rem 0;
    color: #fff;
    font-size: 1.1rem;
`;

const StatusBadge = styled.span`
    display: inline-block;
    padding: 0.25rem 0.75rem;
    border-radius: 9999px;
    font-size: 0.75rem;
    font-weight: bold;
    background: ${({ $status }) =>
        $status === 'Ongoing' ? 'rgba(16, 185, 129, 0.3)' :
            $status === 'Complete' ? 'rgba(59, 130, 246, 0.3)' :
                'rgba(255, 255, 255, 0.1)'
    };
    color: ${({ $status }) =>
        $status === 'Ongoing' ? '#10b981' :
            $status === 'Complete' ? '#3b82f6' :
                'rgba(255, 255, 255, 0.7)'
    };
    margin-left: 0.5rem;
`;

const ConfidenceBadge = styled.span`
    display: inline-block;
    padding: 0.35rem 0.85rem;
    border-radius: 9999px;
    font-size: 0.75rem;
    font-weight: bold;
    background: ${({ $confidence }) =>
        $confidence === 'high' ? 'rgba(16, 185, 129, 0.2)' :
            $confidence === 'medium' ? 'rgba(245, 158, 11, 0.2)' :
                'rgba(239, 68, 68, 0.2)'
    };
    color: ${({ $confidence }) =>
        $confidence === 'high' ? '#34d399' :
            $confidence === 'medium' ? '#fbbf24' :
                '#f87171'
    };
    border: 1px solid currentColor;
    margin-bottom: 1rem;
`;

const Description = styled.p`
    font-size: 0.9rem;
    color: rgba(255, 255, 255, 0.7);
    line-height: 1.6;
    margin: 0.75rem 0;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
`;

const ReadButton = styled.a`
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1.5rem;
    background: linear-gradient(135deg, #8b5cf6, #3b82f6);
    color: white;
    text-decoration: none;
    border-radius: 8px;
    font-weight: bold;
    margin-top: 1rem;
    transition: transform 0.2s, box-shadow 0.2s;

    &:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 15px rgba(139, 92, 246, 0.4);
    }
`;

const LoadingState = styled.div`
    text-align: center;
    padding: 2rem;
    color: rgba(255, 255, 255, 0.5);
`;

const NoDataState = styled.div`
    text-align: center;
    padding: 2rem;
    color: rgba(255, 255, 255, 0.5);
`;

export const MangaGuide = ({ animeId, animeTitle }) => {
    const [expanded, setExpanded] = useState(false);
    const [loading, setLoading] = useState(false);
    const [mangaData, setMangaData] = useState(null);
    const [hasFetched, setHasFetched] = useState(false);

    // Fetch data when expanded for the first time
    useEffect(() => {
        if (expanded && !hasFetched) {
            setLoading(true);
            setHasFetched(true);
            getMangaContinuationWithFallback(animeId, animeTitle)
                .then(data => {
                    setMangaData(data);
                })
                .catch(console.error)
                .finally(() => setLoading(false));
        }
    }, [expanded, hasFetched, animeId, animeTitle]);

    return (
        <Container>
            <Header onClick={() => setExpanded(!expanded)}>
                <Title>
                    <Icon icon="bi:book-fill" style={{ color: '#a78bfa' }} />
                    📖 Manga Guide - Where to Continue Reading
                </Title>
                <Icon icon={expanded ? "bi:chevron-up" : "bi:chevron-down"} />
            </Header>

            <Content $expanded={expanded}>
                {loading && (
                    <LoadingState>
                        <Icon icon="eos-icons:loading" style={{ fontSize: '2rem' }} />
                        <p>Searching manga database...</p>
                    </LoadingState>
                )}

                {!loading && !mangaData && hasFetched && (
                    <NoDataState>
                        <Icon icon="bi:question-circle" style={{ fontSize: '2rem', marginBottom: '0.5rem' }} />
                        <p>No manga continuation data found for this anime.</p>
                        <p style={{ fontSize: '0.85rem' }}>
                            Try searching manually on{' '}
                            <a href="https://www.mangaupdates.com" target="_blank" rel="noopener noreferrer" style={{ color: '#a78bfa' }}>
                                MangaUpdates
                            </a>
                        </p>
                    </NoDataState>
                )}

                {!loading && mangaData && (
                    <InfoCard>
                        <ContinuationBox>
                            <ChapterLabel>Continue from</ChapterLabel>
                            <ChapterNumber>Ch. {mangaData.endChapter || '?'}</ChapterNumber>
                            {mangaData.endVolume && (
                                <VolumeInfo>Volume {mangaData.endVolume}</VolumeInfo>
                            )}
                            {mangaData.confidence && (
                                <ConfidenceBadge $confidence={mangaData.confidence}>
                                    {mangaData.confidence === 'high' ? '✓ Verified' :
                                        mangaData.confidence === 'medium' ? '~ Estimated' :
                                            '? Approximation'}
                                </ConfidenceBadge>
                            )}
                        </ContinuationBox>

                        <MangaInfo>
                            <MangaTitle>
                                {mangaData.mangaTitle}
                                {mangaData.status && (
                                    <StatusBadge $status={mangaData.status}>
                                        {mangaData.status}
                                    </StatusBadge>
                                )}
                            </MangaTitle>

                            {mangaData.description && (
                                <Description>{mangaData.description}</Description>
                            )}

                            {mangaData.totalChapters && (
                                <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)' }}>
                                    Total chapters available: {mangaData.totalChapters}+
                                </p>
                            )}

                            {mangaData.source && (
                                <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', fontStyle: 'italic', marginTop: '0.5rem' }}>
                                    Data source: {mangaData.source}
                                </p>
                            )}

                            <ReadButton
                                href={`https://www.google.com/search?q=read+${encodeURIComponent(mangaData.mangaTitle)}+manga+chapter+${mangaData.endChapter || 1}`}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                <Icon icon="bi:search" /> Find Where to Read
                            </ReadButton>
                        </MangaInfo>
                    </InfoCard>
                )}
            </Content>
        </Container>
    );
};
