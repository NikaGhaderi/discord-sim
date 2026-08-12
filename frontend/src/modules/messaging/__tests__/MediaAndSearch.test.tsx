// @vitest-environment jsdom
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MediaUploadButton, SelectedFile } from '../components/MediaUploadButton';
import { SearchBar } from '../components/SearchBar';

describe('SCRUM-44 Media & Search UI', () => {
  describe('MediaUploadButton', () => {
    it('shows file name and size after selecting a file', () => {
      const handleFileSelect = vi.fn();
      const mockFile = new File(['dummy content'], 'test-image.png', { type: 'image/png' });

      const { rerender } = render(
        <MediaUploadButton selectedFile={null} onFileSelect={handleFileSelect} />
      );

      const input = screen.getByTestId('media-file-input');
      fireEvent.change(input, { target: { files: [mockFile] } });

      expect(handleFileSelect).toHaveBeenCalledWith({
        name: 'test-image.png',
        size: 13,
        file: mockFile,
      });

      const selectedState: SelectedFile = {
        name: 'test-image.png',
        size: 13,
        file: mockFile,
      };

      rerender(
        <MediaUploadButton selectedFile={selectedState} onFileSelect={handleFileSelect} />
      );

      expect(screen.getByText('test-image.png')).toBeInTheDocument();
      expect(screen.getByText('(13 B)')).toBeInTheDocument();
    });

    it('clears selected file when remove button is clicked', () => {
      const handleFileSelect = vi.fn();
      const mockFile = new File(['dummy'], 'sample.pdf', { type: 'application/pdf' });
      const selectedState: SelectedFile = {
        name: 'sample.pdf',
        size: 5,
        file: mockFile,
      };

      render(
        <MediaUploadButton selectedFile={selectedState} onFileSelect={handleFileSelect} />
      );

      fireEvent.click(screen.getByRole('button', { name: /remove attachment/i }));
      expect(handleFileSelect).toHaveBeenCalledWith(null);
    });
  });

  describe('SearchBar', () => {
    const mockResults = [
      { id: '1', sender: 'Alice', timestamp: '10:00', snippet: 'Deploying backend' },
      { id: '2', sender: 'Bob', timestamp: '10:05', snippet: 'Frontend ready' },
    ];

    it('returns matching results upon query submission', () => {
      render(<SearchBar mockData={mockResults} />);

      const input = screen.getByPlaceholderText('Search messages...');
      fireEvent.change(input, { target: { value: 'Deploying' } });
      fireEvent.click(screen.getByRole('button', { name: /search/i }));

      const items = screen.getAllByTestId('search-result-item');
      expect(items).toHaveLength(1);
      expect(screen.getByText('Alice')).toBeInTheDocument();
      expect(screen.getByText('Deploying backend')).toBeInTheDocument();
    });

    it('shows no results when submitting an empty or whitespace query', () => {
      render(<SearchBar mockData={mockResults} />);

      const input = screen.getByPlaceholderText('Search messages...');
      fireEvent.change(input, { target: { value: '   ' } });

      expect(screen.queryByTestId('search-result-item')).not.toBeInTheDocument();
    });
  });
});