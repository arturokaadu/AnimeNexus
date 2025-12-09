import React, { useState } from 'react';
import styled from 'styled-components';
import { Icon } from '@iconify/react';
import { getMangaContinuation } from '../../services/mangaService';

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

const EpisodeForm = styled.div`
    display: flex;
    gap: 1rem;
    align-items: flex-end;
    margin-bottom: 1.5rem;
    flex-wrap: wrap;
`;

const FormGroup = styled.div`
    flex: 1;
    min-width: 150px;
    
    label {
        display: block;
        font-size: 0.85rem;
        color: rgba(255, 255, 255, 0.7);
        margin-bottom: 0.5rem;
    }

    input {
        width: 100%;
        padding: 0.6rem 0.8rem;
        background: rgba(0, 0, 0, 0.3);
        border: 1px solid rgba(255, 255, 255, 0.15);
        border-radius: 6px;
        color: white;
        font-size: 1rem;

        &:focus {
            outline: none;
            border-color: #a78bfa;
        }
    }
`;

const SubmitButton = styled.button`
    padding: 0.6rem 1.5rem;
    background: linear-gradient(45deg, #8b5cf6, #6366f1);
    color: white;
    border: none;
    border-radius: 6px;
    font-weight: bold;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    gap: 0.5rem;

    &:hover:not(:disabled) {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(139, 92, 246, 0.4);
    }

    &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
`;

const ResultCard = styled.div`
    background: rgba(255, 255, 255, 0.05);
    border-radius: 10px;
    padding: 1.25rem;
    border-left: 4px solid ${({ $confidence }) =>
        $confidence === 'high' ? '#10b981' :
            $confidence === 'medium' ? '#f59e0b' : '#ef4444'
    };
`;

const ConfidenceBadge = styled.span`
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    padding: 0.3rem 0.7rem;
    border-radius: 15px;
    font-size: 0.75rem;
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

const ResultGrid = styled.div`
    display: flex;
    gap: 1.5rem;
    margin: 1rem 0;
    flex-wrap: wrap;
`;

const ResultBox = styled.div`
    background: linear-gradient(135deg, rgba(139, 92, 246, 0.25), rgba(59, 130, 246, 0.25));
    padding: 1rem 1.25rem;
    border-radius: 8px;
    text-align: center;
    min-width: 100px;
`;

const ResultLabel = styled.div`
    font-size: 0.75rem;
    color: rgba(255, 255, 255, 0.6);
    margin-bottom: 0.25rem;
`;

const ResultValue = styled.div`
    font-size: 1.75rem;
    font-weight: bold;
    color: #a78bfa;
`;

const Reasoning = styled.p`
    font-size: 0.9rem;
    color: rgba(255, 255, 255, 0.75);
    line-height: 1.5;
    margin: 0.75rem 0;
    font-style: italic;
`;

const SpecialNote = styled.div`
    background: rgba(245, 158, 11, 0.1);
    border: 1px solid rgba(245, 158, 11, 0.25);
    padding: 0.6rem 0.8rem;
    border-radius: 6px;
    margin-top: 0.75rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: #fbbf24;
    font-size: 0.85rem;
`;

const ActionLink = styled.a`
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.5rem 1rem;
    background: linear-gradient(135deg, #8b5cf6, #3b82f6);
    color: white;
    text-decoration: none;
    border-radius: 6px;
    font-weight: 600;
    font-size: 0.85rem;
    margin-top: 1rem;
    transition: all 0.2s;

    &:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(139, 92, 246, 0.4);
    }
`;

const LoadingState = styled.div`
    text-align: center;
    padding: 1.5rem;
    color: rgba(255, 255, 255, 0.5);
`;

export const MangaGuide = ({ animeId, animeTitle }) => {
    const [expanded, setExpanded] = useState(false);
    const [episode, setEpisode] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);

    const handleSubmit = async () => {
        if (!episode || !animeTitle) return;

        setLoading(true);
        setResult(null);

        try {
            const data = await getMangaContinuation(animeTitle, parseInt(episode));
            setResult(data);
        } catch (error) {
            console.error('Error:', error);
            setResult({
                chapter: null,
                confidence: 'low',
                reasoning: 'Failed to fetch data.'
            });
        } finally {
            setLoading(false);
        }
    };

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
                <EpisodeForm>
                    <FormGroup>
                        <label>Last episode you watched:</label>
                        <input
                            type="number"
                            placeholder="e.g., 12"
                            value={episode}
                            onChange={(e) => setEpisode(e.target.value)}
                            min="1"
                        />
                    </FormGroup>
                    <SubmitButton onClick={handleSubmit} disabled={!episode || loading}>
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

                {loading && (
                    <LoadingState>
                        <Icon icon="eos-icons:loading" style={{ fontSize: '1.5rem' }} />
                        <p>Asking AI for manga data...</p>
                    </LoadingState>
                )}

                {result && !loading && (
                    <ResultCard $confidence={result.confidence}>
                        <ConfidenceBadge $level={result.confidence}>
                            <Icon icon={
                                result.confidence === 'high' ? 'bi:check-circle-fill' :
                                    result.confidence === 'medium' ? 'bi:exclamation-circle-fill' :
                                        'bi:question-circle-fill'
                            } />
                            {result.confidence === 'high' ? 'Verified' :
                                result.confidence === 'medium' ? 'Estimated' : 'Approximate'}
                        </ConfidenceBadge>

                        {result.chapter ? (
                            <>
                                <ResultGrid>
                                    <ResultBox>
                                        <ResultLabel>Continue from</ResultLabel>
                                        <ResultValue>Ch. {result.chapter}</ResultValue>
                                    </ResultBox>
                                    {result.volume && (
                                        <ResultBox>
                                            <ResultLabel>Volume</ResultLabel>
                                            <ResultValue>{result.volume}</ResultValue>
                                        </ResultBox>
                                    )}
                                    {result.buyVolume && (
                                        <ResultBox>
                                            <ResultLabel>Buy</ResultLabel>
                                            <ResultValue>Vol. {result.buyVolume}</ResultValue>
                                        </ResultBox>
                                    )}
                                </ResultGrid>

                                {result.reasoning && (
                                    <Reasoning>"{result.reasoning}"</Reasoning>
                                )}

                                {result.specialNotes && (
                                    <SpecialNote>
                                        <Icon icon="bi:info-circle-fill" />
                                        {result.specialNotes}
                                    </SpecialNote>
                                )}

                                <ActionLink
                                    href={`https://www.google.com/search?q=buy+${encodeURIComponent(animeTitle)}+manga+volume+${result.buyVolume || result.volume || 1}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    <Icon icon="bi:cart-fill" />
                                    Find Volume {result.buyVolume || result.volume || 1}
                                </ActionLink>
                            </>
                        ) : (
                            <Reasoning>{result.reasoning}</Reasoning>
                        )}
                    </ResultCard>
                )}
            </Content>
        </Container>
    );
};
