import 'dart:async';
import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:audioplayers/audioplayers.dart';
import 'package:fluttertoast/fluttertoast.dart';
import 'package:wakelock_plus/wakelock_plus.dart';
import '../models/book_models.dart';
import '../services/api_service.dart';
import '../services/isbn_lookup_service.dart';

class ScanScreen extends StatefulWidget {
  final ApiService api;
  final Category category;
  final List<Tag> tags;

  const ScanScreen({
    super.key,
    required this.api,
    required this.category,
    required this.tags,
  });

  @override
  State<ScanScreen> createState() => _ScanScreenState();
}

class _ScanScreenState extends State<ScanScreen> {
  final MobileScannerController _controller = MobileScannerController(
    formats: [BarcodeFormat.ean13, BarcodeFormat.ean8],
  );
  final AudioPlayer _audioPlayer = AudioPlayer();
  final IsbnLookupService _isbnService = const IsbnLookupService();

  bool _processing = false;
  bool _torchOn = false;
  String? _lastIsbn;
  DateTime? _lastScanTime;

  static const _debounceDuration = Duration(seconds: 2);

  @override
  void initState() {
    super.initState();
    WakelockPlus.enable();
  }

  @override
  void dispose() {
    WakelockPlus.disable();
    _controller.dispose();
    _audioPlayer.dispose();
    super.dispose();
  }

  Future<void> _toggleTorch() async {
    await _controller.toggleTorch();
    setState(() => _torchOn = !_torchOn);
  }

  Future<void> _onDetect(BarcodeCapture capture) async {
    if (_processing) return;
    final barcodes = capture.barcodes;

    if (barcodes.isEmpty) return;

    if (barcodes.length > 1) {
      await _playError();
      _showToast('Multiple barcodes detected. Please scan one at a time.', isError: true);
      return;
    }

    final barcode = barcodes.first;
    final isbn = barcode.rawValue;
    if (isbn == null || isbn.isEmpty) return;

    // Debounce: ignore same ISBN within debounce window
    final now = DateTime.now();
    if (isbn == _lastIsbn && _lastScanTime != null && now.difference(_lastScanTime!) < _debounceDuration) {
      return;
    }

    // Only accept EAN-13 Bookland prefixes (978/979 = ISBN)
    if (isbn.length == 13 && !isbn.startsWith('978') && !isbn.startsWith('979')) {
      await _playError();
      _showToast('Not an ISBN barcode ($isbn)', isError: true);
      return;
    }

    setState(() => _processing = true);
    _lastIsbn = isbn;
    _lastScanTime = now;

    try {
      await _playSuccess();

      final metadata = await _isbnService.lookup(isbn);

      final request = CreateBookRequest(
        isbn: isbn,
        title: metadata?.title,
        authors: metadata?.authors,
        publisher: metadata?.publisher,
        publishedDate: metadata?.publishedDate,
        description: metadata?.description,
        pageCount: metadata?.pageCount,
        thumbnailUrl: metadata?.thumbnailUrl,
        language: metadata?.language,
        categoryId: widget.category.id,
        tagIds: widget.tags.map((t) => t.id).toList(),
        isbnRawData: metadata?.rawData,
        notes: metadata == null ? 'No metadata found for this ISBN' : null,
      );

      await widget.api.createBook(request);

      if (metadata == null) {
        _showToast('ISBN $isbn saved (no metadata found)', isError: false);
      }
    } catch (e) {
      await _playError();
      _showToast('Error: ${e.toString()}', isError: true);
    } finally {
      if (mounted) setState(() => _processing = false);
    }
  }

  Future<void> _playSuccess() async {
    await _audioPlayer.play(AssetSource('sounds/beep_success.mp3'));
  }

  Future<void> _playError() async {
    await _audioPlayer.play(AssetSource('sounds/beep_error.mp3'));
  }

  void _showToast(String msg, {required bool isError}) {
    Fluttertoast.showToast(
      msg: msg,
      toastLength: Toast.LENGTH_SHORT,
      backgroundColor: isError ? Colors.red : Colors.green,
      textColor: Colors.white,
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Stack(
        children: [
          MobileScanner(
            controller: _controller,
            onDetect: _onDetect,
          ),
          // Top info bar (category / tags + processing indicator)
          SafeArea(
            child: Container(
              color: Colors.black54,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              child: Row(children: [
                Expanded(
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text('Category: ${widget.category.name}',
                        style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                    if (widget.tags.isNotEmpty)
                      Text('Tags: ${widget.tags.map((t) => t.name).join(', ')}',
                          style: const TextStyle(color: Colors.white70, fontSize: 12)),
                  ]),
                ),
                if (_processing)
                  const SizedBox(width: 20, height: 20,
                      child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2)),
              ]),
            ),
          ),
          // Flashlight toggle — top-right corner
          Positioned(
            top: 0,
            right: 0,
            child: SafeArea(
              child: IconButton(
                icon: Icon(
                  _torchOn ? Icons.flash_on : Icons.flash_off,
                  color: Colors.white,
                ),
                tooltip: _torchOn ? 'Turn off flashlight' : 'Turn on flashlight',
                onPressed: _toggleTorch,
              ),
            ),
          ),
          // Stop scanning button
          Positioned(
            bottom: 40,
            left: 0,
            right: 0,
            child: Center(
              child: ElevatedButton.icon(
                icon: const Icon(Icons.stop),
                label: const Text('Stop Scanning'),
                onPressed: () => Navigator.pop(context),
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.red,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 16),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
